import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { OrderStatus, Prisma, RequestStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class WaiterService {
  private readonly logger = new Logger(WaiterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Get all requests with filtering and pagination
   * @param options Filter and pagination options
   * @returns Array of requests
   */
  async getAllRequests(options: {
    status?: string;
    sort?: 'time' | 'status';
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<any[]> {
    const { status, sort, search, page, pageSize } = options;

    // Build the where clause based on filters
    const where: Prisma.RequestWhereInput = {};

    // Filter by status if provided and not 'all'
    if (status && status !== 'all') {
      where.status = status as RequestStatus;
    }

    // Add search filter if provided
    if (search) {
      where.content = {
        contains: search,
        mode: 'insensitive', // Case-insensitive search
      };
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Determine sort order
    const orderBy: Prisma.RequestOrderByWithRelationInput = {};
    if (sort === 'status') {
      orderBy.status = 'asc';
      orderBy.createdAt = 'desc'; // Secondary sort by creation time
    } else {
      // Default sort by time (newest first)
      orderBy.createdAt = 'desc';
    }

    try {
      const requests = await this.prisma.request.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return requests;
    } catch (error) {
      this.logger.error(`Error retrieving requests: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Get active requests (New, Acknowledged, InProgress)
   * @returns Array of active requests
   */
  async getActiveRequests(): Promise<any[]> {
    try {
      const requests = await this.prisma.request.findMany({
        where: {
          status: {
            in: [RequestStatus.New, RequestStatus.Acknowledged, RequestStatus.InProgress],
          },
        },
        orderBy: [
          { status: 'asc' }, // New first, then Acknowledged, then InProgress
          { createdAt: 'asc' }, // Oldest first within each status
        ],
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return requests.map((request) => ({
        ...request,
        // Truncate content to first 50 characters for preview
        content:
          request.content.length > 50
            ? `${request.content.substring(0, 50)}...`
            : request.content,
      }));
    } catch (error) {
      this.logger.error(`Error retrieving active requests: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Update the status of a request
   * @param id Request ID
   * @param newStatus New status to set
   * @returns Updated request
   */
  async updateRequestStatus(
    id: string,
    newStatus: 'Acknowledged' | 'InProgress' | 'Completed',
  ): Promise<any> {
    try {
      // Validate that the request exists
      const request = await this.prisma.request.findUnique({
        where: { id },
      });

      if (!request) {
        throw new NotFoundException(`Request with ID ${id} not found`);
      }

      // Validate status transitions
      const validTransitions: Record<RequestStatus, RequestStatus[]> = {
        [RequestStatus.New]: [
          RequestStatus.Acknowledged,
          RequestStatus.InProgress,
          RequestStatus.Completed,
        ],
        [RequestStatus.Acknowledged]: [RequestStatus.InProgress, RequestStatus.Completed],
        [RequestStatus.InProgress]: [RequestStatus.Completed],
        [RequestStatus.Completed]: [], // Cannot transition from Completed
        [RequestStatus.OnHold]: [RequestStatus.InProgress, RequestStatus.Completed],
        [RequestStatus.Cancelled]: [], // Cannot transition from Cancelled
        [RequestStatus.Done]: [], // Cannot transition from Done
      };

      const targetStatus = newStatus as RequestStatus;
      const currentStatus = request.status;

      if (!validTransitions[currentStatus].includes(targetStatus)) {
        throw new Error(
          `Invalid status transition from ${currentStatus} to ${targetStatus}`,
        );
      }

      // Update the request status
      const updatedRequest = await this.prisma.$transaction(async (tx) => {
        // Update the request
        const updated = await tx.request.update({
          where: { id },
          data: { status: targetStatus },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // Log the status change
        await tx.requestLog.create({
          data: {
            requestId: id,
            action: `Status changed from ${currentStatus} to ${targetStatus}`,
          },
        });

        return updated;
      });

      return updatedRequest;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating request status: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to update request status: ${error.message}`);
    }
  }

  /**
   * Get a summary of open and closed requests
   * @returns Counts of open and closed requests
   */
  async getRequestsSummary(): Promise<{ open: number; closed: number }> {
    try {
      const openCount = await this.prisma.request.count({
        where: {
          status: {
            in: [RequestStatus.New, RequestStatus.Acknowledged, RequestStatus.InProgress],
          },
        },
      });

      const closedCount = await this.prisma.request.count({
        where: {
          status: {
            in: [RequestStatus.Completed, RequestStatus.Cancelled, RequestStatus.Done],
          },
        },
      });

      return { open: openCount, closed: closedCount };
    } catch (error) {
      this.logger.error(
        `Error retrieving requests summary: ${error.message}`,
        error.stack,
      );
      return { open: 0, closed: 0 };
    }
  }

  /**
   * Get a summary of reviews (average rating and total count)
   * @returns Average rating and total reviews
   */
  async getReviewsSummary(): Promise<{ averageRating: number; totalReviews: number }> {
    try {
      const reviews = await this.prisma.review.findMany({
        select: { rating: true },
      });

      if (reviews.length === 0) {
        return { averageRating: 0, totalReviews: 0 };
      }

      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = parseFloat((totalRating / reviews.length).toFixed(1));

      return { averageRating, totalReviews: reviews.length };
    } catch (error) {
      this.logger.error(
        `Error retrieving reviews summary: ${error.message}`,
        error.stack,
      );
      return { averageRating: 0, totalReviews: 0 };
    }
  }

  /**
   * Get a paginated list of reviews
   * @param page Page number (default: 1)
   * @param pageSize Number of reviews per page (default: 10)
   * @returns Paginated list of reviews
   */
  async getPaginatedReviews(
    page = 1,
    pageSize = 10,
  ): Promise<any[]> {
    try {
      const skip = (page - 1) * pageSize;

      const reviews = await this.prisma.review.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return reviews;
    } catch (error) {
      this.logger.error(
        `Error retrieving paginated reviews: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get AI analysis of waiter performance for today
   * @returns AI analysis text
   */
  async getAIAnalysis(): Promise<string> {
    try {
      // This is a placeholder. In a real implementation, this would call an AI service
      // or use a more sophisticated algorithm to analyze performance data.
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      // Get some basic metrics for today
      const requestsHandled = await this.prisma.request.count({
        where: {
          status: RequestStatus.Completed,
          updatedAt: {
            gte: new Date(`${todayString}T00:00:00Z`),
            lt: new Date(`${todayString}T23:59:59Z`),
          },
        },
      });

      const averageRating = await this.prisma.review.aggregate({
        where: {
          createdAt: {
            gte: new Date(`${todayString}T00:00:00Z`),
            lt: new Date(`${todayString}T23:59:59Z`),
          },
        },
        _avg: {
          rating: true,
        },
      });

      // Generate a simple analysis based on the metrics
      let analysis = `Today (${today.toLocaleDateString()}), you have handled ${requestsHandled} requests. `;

      if (averageRating._avg.rating) {
        analysis += `Your average rating is ${averageRating._avg.rating.toFixed(
          1,
        )} out of 5. `;
      } else {
        analysis += `You haven't received any ratings yet today. `;
      }

      if (requestsHandled > 10) {
        analysis += `You're doing a great job handling a high volume of requests!`;
      } else if (requestsHandled > 5) {
        analysis += `You're maintaining a steady pace with request handling.`;
      } else {
        analysis += `It's been a quiet day so far.`;
      }

      return analysis;
    } catch (error) {
      this.logger.error(`Error generating AI analysis: ${error.message}`, error.stack);
      return 'Unable to generate performance analysis at this time.';
    }
  }

  /**
   * Create a new waiter rating
   * @param dto Rating data
   * @returns Created rating
   */
  async createRating(dto: any): Promise<any> {
    try {
      const rating = await this.prisma.waiterRating.create({
        data: {
          userId: dto.userId,
          waiterId: dto.waiterId,
          friendliness: dto.friendliness,
          orderAccuracy: dto.orderAccuracy,
          speed: dto.speed,
          attentiveness: dto.attentiveness,
          knowledge: dto.knowledge,
          comment: dto.comment,
        },
      });

      return rating;
    } catch (error) {
      this.logger.error(`Error creating waiter rating: ${error.message}`, error.stack);
      throw new Error(`Failed to create waiter rating: ${error.message}`);
    }
  }

  /**
   * Get allocated tables for the current waiter
   * @param waiterId Waiter ID
   * @returns Array of table numbers
   */
  private async getWaiterAllocatedTables(waiterId: string): Promise<number[]> {
    try {
      const now = new Date();
      
      const allocation = await this.prisma.tableAllocation.findFirst({
        where: {
          waiterId,
          shift: {
            startTime: { lte: now },
            endTime: { gte: now },
          },
        },
        select: {
          tableNumbers: true,
        },
      });

      return allocation?.tableNumbers || [];
    } catch (error) {
      this.logger.error(`Error getting allocated tables: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Get orders with pagination and optional status filter
   * @param params Filter and pagination options
   * @returns Paginated list of orders
   */
  async getOrders(params: { page: number; pageSize: number; status?: string }): Promise<any> {
    const { page, pageSize, status } = params;
    const skip = (page - 1) * pageSize;
    
    try {
      // For demo purposes, get all tables (in production, filter by waiter's allocated tables)
      // const waiterId = '3c4d8be2-85bd-4c72-9b6e-748d6e1abf42'; // This should come from JWT token
      // const allocatedTables = await this.getWaiterAllocatedTables(waiterId);
      
      const where: Prisma.OrderWhereInput = {
        // tableNumber: { in: allocatedTables }, // Uncomment in production
      };
      
      if (status && status !== 'all') {
        where.status = status as OrderStatus;
      }
      
      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            orderItems: {
              include: {
                menuItem: {
                  select: {
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.order.count({ where }),
      ]);
      
      return {
        data: orders,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      this.logger.error(`Error getting orders: ${error.message}`, error.stack);
      return {
        data: [],
        meta: { total: 0, page, pageSize, totalPages: 0 },
      };
    }
  }

  /**
   * Get orders grouped by table number with count badges
   * @returns Orders grouped by table
   */
  async getOrdersByTable(): Promise<any> {
    try {
      // For demo purposes, get all tables (in production, filter by waiter's allocated tables)
      // const waiterId = '3c4d8be2-85bd-4c72-9b6e-748d6e1abf42'; // This should come from JWT token
      // const allocatedTables = await this.getWaiterAllocatedTables(waiterId);
      
      const orders = await this.prisma.order.findMany({
        // where: { tableNumber: { in: allocatedTables } }, // Uncomment in production
        include: {
          orderItems: {
            include: {
              menuItem: {
                select: {
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      
      const groupedByTable: Record<number, any> = {};
      
      orders.forEach(order => {
        if (!groupedByTable[order.tableNumber]) {
          groupedByTable[order.tableNumber] = {
            tableNumber: order.tableNumber,
            orders: [],
            newOrdersCount: 0,
          };
        }
        
        groupedByTable[order.tableNumber].orders.push(order);
        
        if (order.status === OrderStatus.New) {
          groupedByTable[order.tableNumber].newOrdersCount++;
        }
      });
      
      return Object.values(groupedByTable);
    } catch (error) {
      this.logger.error(`Error getting orders by table: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Update order status
   * @param id Order ID
   * @param status New status
   * @returns Updated order
   */
  async updateOrderStatus(id: string, status: OrderStatus): Promise<any> {
    try {
      return this.ordersService.updateOrderStatus(id, status);
    } catch (error) {
      this.logger.error(`Error updating order status: ${error.message}`, error.stack);
      throw error;
    }
  }
}
