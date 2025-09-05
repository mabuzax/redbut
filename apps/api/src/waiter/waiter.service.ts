import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SessionCacheService } from '../common/session-cache.service';
import { OrderStatus, Prisma, RequestStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import { RequestStatusConfigService } from '../common/request-status-config.service';
import { OrderStatusConfigService } from '../common/order-status-config.service';
import { ChatService } from '../chat/chat.service';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

@Injectable()
export class WaiterService {
  private readonly logger = new Logger(WaiterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly requestStatusConfigService: RequestStatusConfigService,
    private readonly orderStatusConfigService: OrderStatusConfigService,
    private readonly sessionCache: SessionCacheService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get all requests with filtering and pagination for a specific waiter
   * @param waiterId The ID of the waiter
   * @param options Filter and pagination options
   * @returns Array of requests for waiter's sessions
   */
  async getAllRequests(waiterId: string, options: {
    status?: string;
    sort?: 'time' | 'status';
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<any[]> {
    const { status, sort, search, page, pageSize } = options;

    // Build the where clause based on filters - use sessionId directly
    const waiterSessions = await this.prisma.user.findMany({
      where: { waiterId: waiterId },
      select: { sessionId: true },
    });

    const sessionIds = waiterSessions.map(session => session.sessionId);

    if (sessionIds.length === 0) {
      return []; // No sessions for this waiter
    }

    const where: Prisma.RequestWhereInput = {
      sessionId: { in: sessionIds }, // Direct sessionId filtering
    };

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
              tableNumber: true,
            },
          },
        },
      });

      return requests;
    } catch (error) {
      this.logger.error(`Error retrieving requests for waiter ${waiterId}: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Get active requests (New, Acknowledged, InProgress) for a specific waiter
   * @param waiterId The ID of the waiter
   * @returns Array of active requests for waiter's sessions
   */
  async getActiveRequests(waiterId: string): Promise<any[]> {
    try {
      // Get waiter's session IDs
      const waiterSessions = await this.prisma.user.findMany({
        where: { waiterId: waiterId },
        select: { sessionId: true },
      });

      const sessionIds = waiterSessions.map(session => session.sessionId);

      if (sessionIds.length === 0) {
        return []; // No sessions for this waiter
      }

      const requests = await this.prisma.request.findMany({
        where: {
          status: {
            in: [RequestStatus.New, RequestStatus.Acknowledged, RequestStatus.InProgress],
          },
          sessionId: { in: sessionIds }, // Direct sessionId filtering
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
      // Validate that the request exists and get current status
      const request = await this.prisma.request.findUnique({
        where: { id },
      });

      if (!request) {
        throw new NotFoundException(`Request with ID ${id} not found`);
      }

      const targetStatus = newStatus as RequestStatus;
      const currentStatus = request.status;

      // Validate transition using centralized config
      const userRole = this.getUserRole();
      await this.requestStatusConfigService.validateTransition(
        currentStatus,
        targetStatus,
        userRole,
      );

      // Update the request status within transaction with race condition protection
      const updatedRequest = await this.prisma.$transaction(async (tx) => {
        // Re-fetch current status within transaction to avoid race conditions
        const currentRequestInTx = await tx.request.findUnique({
          where: { id },
          select: { status: true },
        });

        if (!currentRequestInTx) {
          throw new NotFoundException(`Request with ID ${id} not found`);
        }

        // Re-validate within transaction if status changed due to race condition
        if (currentRequestInTx.status !== currentStatus) {
          await this.requestStatusConfigService.validateTransition(
            currentRequestInTx.status,
            targetStatus,
            userRole,
          );
        }

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
            action: `Status changed from ${currentRequestInTx.status} to ${targetStatus}`,
          },
        });

        return updated;
      });

      return updatedRequest;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error updating request status: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`Failed to update request status: ${error.message}`);
    }
  }

  private getUserRole(): string {
    return 'waiter';
  }

  /**
   * Get a summary of open and closed requests for a specific waiter
   * @param waiterId The ID of the waiter
   * @returns Counts of open and closed requests for waiter's sessions
   */
  async getRequestsSummary(waiterId: string): Promise<{ open: number; closed: number }> {
    try {
      // Get all session IDs for this waiter
      const waiterSessions = await this.prisma.user.findMany({
        where: { waiterId: waiterId },
        select: { sessionId: true },
      });

      const sessionIds = waiterSessions.map(session => session.sessionId);

      if (sessionIds.length === 0) {
        return { open: 0, closed: 0 };
      }

      const openCount = await this.prisma.request.count({
        where: {
          sessionId: { in: sessionIds }, // Direct sessionId filtering
          status: {
            in: [RequestStatus.New, RequestStatus.Acknowledged, RequestStatus.InProgress],
          },
        },
      });

      const closedCount = await this.prisma.request.count({
        where: {
          sessionId: { in: sessionIds }, // Direct sessionId filtering
          status: {
            in: [RequestStatus.Completed, RequestStatus.Cancelled, RequestStatus.Done],
          },
        },
      });

      return { open: openCount, closed: closedCount };
    } catch (error) {
      this.logger.error(
        `Error retrieving requests summary for waiter ${waiterId}: ${error.message}`,
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
   * Get AI analysis of waiter performance for today based on service_analysis data
   * @param waiterId The waiter ID to analyze
   * @returns Structured AI analysis
   */
  async getAIAnalysis(waiterId: string): Promise<any> {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // Get service analysis data for this waiter from today
      const serviceAnalysisData = await this.prisma.serviceAnalysis.findMany({
        where: {
          waiterId: waiterId,
          createdAt: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
        include: {
          user: {
            select: {
              tableNumber: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(`Found ${serviceAnalysisData.length} service analysis records for waiter ${waiterId} today`);

      if (serviceAnalysisData.length === 0) {
        return {
          customerSentiment: 'No Data Available',
          happinessBreakdown: {},
          improvementPoints: ['No customer feedback received today'],
          overallAnalysis: 'No customer feedback has been received today. Focus on engaging with customers and encouraging them to provide feedback on their experience.',
        };
      }

      // Prepare data for AI analysis
      const analysisContent = serviceAnalysisData.map((item: any, index: number) => {
        const analysis = item.analysis as any;
        const itemWithRating = item as any; // Type cast to access rating field
        return `Review ${index + 1} (Table ${item.user?.tableNumber || 'Unknown'}):
- Happiness Level: ${analysis.happiness} (Rating: ${itemWithRating.rating || 3}/5)
- What customer said: "${analysis.reason}"
- Suggested improvement: "${analysis.suggested_improvement}"
- Overall sentiment: ${analysis.overall_sentiment}
---`;
      }).join('\n');

      // Create AI prompt with JSON schema for structured output
      const prompt = `You are an AI assistant analyzing a waiter's performance based on customer feedback from today. Please analyze the following service analysis data and provide a structured JSON response.

Customer Feedback Data:
${analysisContent}

Please respond with a JSON object containing exactly these fields:
- overall_sentiment: Overall sentiment assessment (e.g., "Mostly Positive", "Mixed", "Needs Improvement")
- happiness_breakdown: Object with happiness levels as keys and one-line summaries as values
- improvement_points: Array of exactly 2 bullet points for improvement
- overall_analysis: 2-3 sentences with actionable advice

Example format:
{
  "overall_sentiment": "Mostly Positive",
  "happiness_breakdown": {
    "Extremely Happy": "Customers loved the quick service and friendly attitude",
    "Happy": "Good food quality but some minor delays mentioned"
  },
  "improvement_points": [
    "Focus on reducing wait times during peak hours",
    "Ensure consistent follow-up on special requests"
  ],
  "overall_analysis": "Your performance today shows strong customer satisfaction with room for improvement in timing. Continue your excellent interpersonal skills while working on efficiency."
}`;

      // Call AI model with JSON mode
      const model = new ChatOpenAI({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o'),
        temperature: 0.1,
      });

      const aiResponse = await model.invoke([
        { role: 'user', content: prompt }
      ], {
        response_format: { type: 'json_object' }
      });

      this.logger.log('AI Analysis Response:', aiResponse.content);
      
      // Parse the JSON response
      const parsedResponse = JSON.parse(aiResponse.content as string);
      return parsedResponse;

    } catch (error) {
      this.logger.error(`Error generating AI analysis: ${error.message}`, error.stack);
      return {
        overall_sentiment: 'Analysis Unavailable',
        happiness_breakdown: {},
        improvement_points: ['Unable to analyze performance at this time'],
        overall_analysis: 'Performance analysis is temporarily unavailable. Please try again later.',
      };
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
      console.log(`[WaiterService] getWaiterAllocatedTables for waiterId: ${waiterId} at time: ${now.toISOString()}`);
      
      // First, let's see all table allocations for this waiter (regardless of time)
      const allAllocations = await this.prisma.tableAllocation.findMany({
        where: {
          waiterId,
        },
        include: {
          shift: true,
        },
      });
      
      console.log(`[WaiterService] Found ${allAllocations.length} total allocations for waiter:`, 
        allAllocations.map(a => ({
          id: a.id,
          tableNumbers: a.tableNumbers,
          shift: {
            startTime: a.shift.startTime,
            endTime: a.shift.endTime,
            isActive: a.shift.startTime <= now && a.shift.endTime >= now
          }
        }))
      );
      
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

      const result = allocation?.tableNumbers || [];
      console.log(`[WaiterService] Active allocation result:`, result);
      return result;
    } catch (error) {
      console.log(`[WaiterService] Error getting allocated tables:`, error);
      this.logger.error(`Error getting allocated tables: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Get orders with pagination and optional status filter for a specific waiter
   * @param waiterId The ID of the waiter
   * @param params Filter and pagination options
   * @returns Paginated list of orders for waiter's allocated tables
   */
  async getOrders(waiterId: string, params: { page: number; pageSize: number; status?: string }): Promise<any> {
    const { page, pageSize, status } = params;
    const skip = (page - 1) * pageSize;
    
    try {
      // First get all session IDs for this waiter
      const waiterSessions = await this.prisma.user.findMany({
        where: { waiterId: waiterId },
        select: { sessionId: true },
      });

      const sessionIds = waiterSessions.map(session => session.sessionId);

      if (sessionIds.length === 0) {
        return {
          data: [],
          meta: { total: 0, page, pageSize, totalPages: 0 },
        };
      }

      const orderWhere: Prisma.OrderWhereInput = {
        sessionId: { in: sessionIds },
      };
      
      if (status && status !== 'all') {
        orderWhere.status = status as OrderStatus;
      }
      
      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          where: orderWhere,
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
        this.prisma.order.count({ where: orderWhere }),
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
      this.logger.error(`Error getting orders for waiter ${waiterId}: ${error.message}`, error.stack);
      return {
        data: [],
        meta: { total: 0, page, pageSize, totalPages: 0 },
      };
    }
  }

  /**
   * Get orders grouped by table number with count badges for a specific waiter
   * @param waiterId The ID of the waiter
   * @returns Orders grouped by table for waiter's allocated tables
   */
  async getOrdersByTable(waiterId: string): Promise<any> {
    try {
      // Get all session IDs for this waiter
      const waiterSessions = await this.prisma.user.findMany({
        where: { waiterId: waiterId },
        select: { sessionId: true, tableNumber: true },
      });

      if (waiterSessions.length === 0) {
        return []; // No sessions for this waiter, return empty array
      }

      const sessionIds = waiterSessions.map(session => session.sessionId);
      
      const orders = await this.prisma.order.findMany({
        where: { sessionId: { in: sessionIds } },
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
      const order = await this.prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      // Validate transition using centralized config
      const userRole = this.getUserRole();
      await this.orderStatusConfigService.validateTransition(
        order.status,
        status,
        userRole,
      );

      return this.ordersService.updateOrderStatus(id, status, userRole);
    } catch (error) {
      this.logger.error(`Error updating order status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Session Management Methods                                                 */
  /* -------------------------------------------------------------------------- */

  /**
   * Get all waiters for session creation dropdown
   * @returns Array of waiters with basic info
   */
  async getAllWaiters() {
    try {
      return await this.prisma.waiter.findMany({
        select: {
          id: true,
          name: true,
          surname: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
    } catch (error) {
      this.logger.error(`Error fetching waiters: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all active sessions
   * @returns Array of active sessions with waiter info
   */
  async getActiveSessions() {
    try {
      const sessions = await this.prisma.user.findMany({
        include: {
          waiter: {
            select: {
              id: true,
              name: true,
              surname: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(`Retrieved ${sessions.length} active sessions`);
      return sessions;
    } catch (error) {
      this.logger.error(`Error fetching active sessions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get active sessions for a specific waiter
   * @param waiterId The waiter ID to filter sessions for
   * @returns Array of active sessions for the specific waiter
   */
  async getSessionsByWaiterId(waiterId: string) {
    try {
      const sessions = await this.prisma.user.findMany({
        where: {
          waiterId: waiterId,
        },
        include: {
          waiter: {
            select: {
              id: true,
              name: true,
              surname: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get order and request counts for each session
      const sessionsWithCounts = await Promise.all(
        sessions.map(async (session) => {
          const [orderCount, requestCount] = await Promise.all([
            this.prisma.order.count({
              where: {
                sessionId: session.sessionId,
                // You can add status filters here if needed
                // status: { in: [OrderStatus.New, OrderStatus.Acknowledged, OrderStatus.InProgress] }
              },
            }),
            this.prisma.request.count({
              where: {
                sessionId: session.sessionId, // Direct sessionId filtering
                // You can add status filters here if needed
                // status: { in: [RequestStatus.New, RequestStatus.Acknowledged, RequestStatus.InProgress] }
              },
            }),
          ]);

          return {
            sessionId: session.sessionId,
            tableNumber: session.tableNumber,
            waiterId: session.waiterId,
            createdAt: session.createdAt,
            waiter: session.waiter,
            orderCount: orderCount,
            requestCount: requestCount,
            qrCodeUrl: `${process.env.WEB_APP_URL || 'http://localhost:3000'}?session=${session.sessionId}`,
          };
        })
      );

      this.logger.log(`Retrieved ${sessions.length} active sessions for waiter ${waiterId}`);
      return sessionsWithCounts;
    } catch (error) {
      this.logger.error(`Error fetching sessions for waiter ${waiterId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get orders for a specific session (waiter can only access orders from their allocated tables)
   * @param waiterId The ID of the waiter
   * @param sessionId The session ID to get orders for
   * @returns Array of orders for the session
   */
  async getOrdersBySession(waiterId: string, sessionId: string) {
    try {
      // Verify the session belongs to this waiter
      const session = await this.prisma.user.findFirst({
        where: {
          sessionId: sessionId,
          waiterId: waiterId, // Ensure session belongs to this waiter
        },
      });

      if (!session) {
        throw new NotFoundException('Session not found or not accessible');
      }

      // Fetch orders for the session
      const orders = await this.prisma.order.findMany({
        where: {
          sessionId: sessionId,
        },
        include: {
          orderItems: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(`Retrieved ${orders.length} orders for session ${sessionId} (waiter ${waiterId})`);
      return orders;
    } catch (error) {
      this.logger.error(`Error fetching orders for session ${sessionId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get requests for a specific session (waiter can only access requests from their assigned sessions)
   * @param waiterId The ID of the waiter
   * @param sessionId The session ID to get requests for
   * @returns Array of requests for the session
   */
  async getRequestsBySession(waiterId: string, sessionId: string) {
    try {
      // Verify the session belongs to this waiter
      const session = await this.prisma.user.findFirst({
        where: {
          sessionId: sessionId,
          waiterId: waiterId, // Ensure session belongs to this waiter
        },
      });

      if (!session) {
        throw new NotFoundException('Session not found or not accessible');
      }

      // Fetch requests for the session
      const requests = await this.prisma.request.findMany({
        where: {
          sessionId: sessionId, // Direct sessionId filtering
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              tableNumber: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(`Retrieved ${requests.length} requests for session ${sessionId} (waiter ${waiterId})`);
      return requests;
    } catch (error) {
      this.logger.error(`Error fetching requests for session ${sessionId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a new table session
   * @param tableNumber The table number
   * @param waiterId The assigned waiter ID
   * @param sessionId The unique session ID
   * @returns Created session data
   */
  async createSession(tableNumber: number, waiterId: string, sessionId: string) {
    try {
      // Validate that the waiter exists
      const waiter = await this.prisma.waiter.findUnique({
        where: { id: waiterId },
      });

      if (!waiter) {
        throw new NotFoundException('Waiter not found');
      }

      // Create a new user entry with the session
      const user = await this.prisma.user.create({
        data: {
          tableNumber,
          sessionId,
          waiterId: waiterId, // Using the TypeScript field name
          name: null, // Will be updated when customer provides name/email/phone
        },
      });

      this.logger.log(`Created session ${sessionId} for table ${tableNumber} with waiter ${waiter.name} ${waiter.surname}`);

      return {
        message: 'Session created successfully',
        sessionId,
        tableNumber,
        waiter: {
          id: waiter.id,
          name: waiter.name,
          surname: waiter.surname,
        },
        userId: user.id,
      };
    } catch (error) {
      this.logger.error(`Error creating session: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Close a table session (move to closed_sessions table)
   * @param sessionId The session ID to close
   * @returns Success message
   */
  async closeSession(sessionId: string) {
    try {
      // Find the active user session
      const user = await this.prisma.user.findFirst({
        where: { sessionId },
        include: { waiter: true },
      });

      if (!user) {
        throw new NotFoundException('Session not found');
      }

      // Move session to closed_sessions table
      await this.prisma.closedSession.create({
        data: {
          originalUserId: user.id,
          name: user.name,
          tableNumber: user.tableNumber,
          sessionId: user.sessionId,
          waiterId: user.waiterId,
          createdAt: user.createdAt,
        },
      });

      // Delete from active users table
      await this.prisma.user.delete({
        where: { id: user.id },
      });

      // Invalidate session cache for this user
      await this.sessionCache.invalidate(user.id);
      this.logger.log(`Invalidated session cache for user ${user.id} on table close`);

      this.logger.log(`Closed session ${sessionId} for table ${user.tableNumber} (waiter: ${user.waiter?.name || 'N/A'} ${user.waiter?.surname || ''})`);

      return {
        message: 'Session closed successfully',
        sessionId,
        tableNumber: user.tableNumber,
      };
    } catch (error) {
      this.logger.error(`Error closing session: ${error.message}`, error.stack);
      throw error;
    }
  }
}
