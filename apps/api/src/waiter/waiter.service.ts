import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SessionCacheService } from '../common/session-cache.service';
import { OrderStatus, Prisma, RequestStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import { ChatService } from '../chat/chat.service';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { DateUtil } from '../common/utils/date.util';

@Injectable()
export class WaiterService {
  private readonly logger = new Logger(WaiterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
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
      where: { 
        waiterId: waiterId,
        sessionId: { not: { startsWith: 'CLOSED_' } } // Exclude closed sessions
      },
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
        where: { 
          waiterId: waiterId,
          sessionId: { not: { startsWith: 'CLOSED_' } } // Exclude closed sessions
        },
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
            actor: 'waiter',
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
        where: { 
          waiterId: waiterId,
          sessionId: { not: { startsWith: 'CLOSED_' } } // Exclude closed sessions
        },
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
   * Get a summary of reviews (average rating and total count) from service analysis for a specific waiter today
   * Session-aware: Only includes ratings from sessions where the waiter was responsible during rating creation
   * @param waiterId The ID of the waiter
   * @returns Average rating and total reviews attributed to waiter's session responsibility
   */
  async getReviewsSummary(waiterId: string): Promise<{ averageRating: number; totalReviews: number }> {
    try {
      const { startDate, endDate } = DateUtil.getTodayDateRange();
      
      // Get all service analysis records for today
      const allServiceAnalyses = await this.prisma.serviceAnalysis.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lt: new Date(endDate),
          },
        },
        select: { 
          id: true,
          sessionId: true,
          rating: true,
          createdAt: true
        },
      });

      if (allServiceAnalyses.length === 0) {
        return { averageRating: 0, totalReviews: 0 };
      }

      // Get unique session IDs and reconstruct timelines
      const sessionIds = [...new Set(allServiceAnalyses.map(analysis => analysis.sessionId))];
      const sessionTimelines = await Promise.all(
        sessionIds.map(sessionId => this.reconstructSessionTimeline(sessionId, new Date(startDate), new Date(endDate)))
      );

      // Filter ratings that were created during this waiter's responsibility periods
      const attributedRatings: number[] = [];
      
      for (const analysis of allServiceAnalyses) {
        const sessionTimeline = sessionTimelines.find(timeline => 
          timeline.some(period => period.waiterId === waiterId)
        );

        if (sessionTimeline) {
          const waiterPeriod = sessionTimeline.find(period => 
            period.waiterId === waiterId &&
            analysis.createdAt >= period.startTime && 
            analysis.createdAt <= period.endTime
          );

          if (waiterPeriod) {
            attributedRatings.push(analysis.rating);
          }
        }
      }

      if (attributedRatings.length === 0) {
        return { averageRating: 0, totalReviews: 0 };
      }

      const totalRating = attributedRatings.reduce((sum, rating) => sum + rating, 0);
      const averageRating = parseFloat((totalRating / attributedRatings.length).toFixed(1));

      this.logger.log(`Session-aware reviews for waiter ${waiterId}: ${attributedRatings.length} attributed ratings from ${allServiceAnalyses.length} total today`);

      return { averageRating, totalReviews: attributedRatings.length };
    } catch (error) {
      this.logger.error(
        `Error retrieving session-aware reviews summary for waiter ${waiterId}: ${error.message}`,
        error.stack,
      );
      return { averageRating: 0, totalReviews: 0 };
    }
  }

  /**
   * Get a paginated list of reviews from service analysis for a specific waiter today
   * Session-aware: Only includes ratings from sessions where the waiter was responsible during rating creation
   * @param waiterId The ID of the waiter
   * @param page Page number (default: 1)
   * @param pageSize Number of reviews per page (default: 10)
   * @returns Paginated list of reviews attributed to waiter's session responsibility
   */
  async getPaginatedReviews(
    waiterId: string,
    page = 1,
    pageSize = 10,
  ): Promise<any[]> {
    try {
      const { startDate, endDate } = DateUtil.getTodayDateRange();
      
      // Get all service analysis records for today (no pagination yet - we need to filter first)
      const allServiceAnalyses = await this.prisma.serviceAnalysis.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lt: new Date(endDate),
          },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          waiter: {
            select: {
              id: true,
              name: true,
              surname: true,
              tag_nickname: true,
            },
          },
        },
      });

      if (allServiceAnalyses.length === 0) {
        return [];
      }

      // Get unique session IDs and reconstruct timelines
      const sessionIds = [...new Set(allServiceAnalyses.map(analysis => analysis.sessionId))];
      const sessionTimelines = await Promise.all(
        sessionIds.map(sessionId => this.reconstructSessionTimeline(sessionId, new Date(startDate), new Date(endDate)))
      );

      // Filter reviews that were created during this waiter's responsibility periods
      const attributedReviews: any[] = [];
      
      for (const analysis of allServiceAnalyses) {
        const sessionTimeline = sessionTimelines.find(timeline => 
          timeline.some(period => period.waiterId === waiterId)
        );

        if (sessionTimeline) {
          const waiterPeriod = sessionTimeline.find(period => 
            period.waiterId === waiterId &&
            analysis.createdAt >= period.startTime && 
            analysis.createdAt <= period.endTime
          );

          if (waiterPeriod) {
            // Transform to match expected review format
            attributedReviews.push({
              id: analysis.id,
              rating: analysis.rating,
              comment: analysis.analysis, // The analysis JSON contains detailed feedback
              createdAt: analysis.createdAt,
              serviceType: analysis.serviceType,
              user: analysis.user,
              waiter: analysis.waiter,
              analysis: analysis.analysis, // Full analysis data
              sessionId: analysis.sessionId,
              sessionResponsibilityPeriod: waiterPeriod // For debugging/transparency
            });
          }
        }
      }

      // Apply pagination after filtering
      const skip = (page - 1) * pageSize;
      const paginatedReviews = attributedReviews.slice(skip, skip + pageSize);

      this.logger.log(`Session-aware paginated reviews for waiter ${waiterId}: Returning ${paginatedReviews.length} reviews (page ${page}) from ${attributedReviews.length} attributed reviews out of ${allServiceAnalyses.length} total today`);

      return paginatedReviews;
    } catch (error) {
      this.logger.error(
        `Error retrieving session-aware paginated reviews for waiter ${waiterId}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get comprehensive AI analysis for waiter including customer sentiment and request management insights
   * @param waiterId The waiter ID to analyze
   * @returns Structured AI analysis with customer sentiment and request performance
   */
  async getAIAnalysis(waiterId: string): Promise<any> {
    try {
      const { startDate, endDate } = DateUtil.getTodayDateRange();

      this.logger.log(`AI Analysis for waiter ${waiterId} - Date range: ${startDate} to ${endDate}`);

      // Get ALL requests from sessions where this waiter has activity today (not just today's requests)
      // First, get all sessions where this waiter had activity today according to session logs
      const waiterSessionActivity = await this.prisma.userSessionLog.findMany({
        where: {
          actorId: waiterId,
          actorType: 'waiter',
          dateTime: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          }
        },
        select: { sessionId: true },
        distinct: ['sessionId']
      });

      const sessionIdsFromActivity = waiterSessionActivity.map(activity => activity.sessionId);
      
      this.logger.log(`Found session activity for waiter ${waiterId} in ${sessionIdsFromActivity.length} sessions: ${sessionIdsFromActivity.join(', ')}`);

      // Also get current active sessions for this waiter
      const waiterSessions = await this.prisma.user.findMany({
        where: { 
          waiterId: waiterId,
          sessionId: { not: { startsWith: 'CLOSED_' } } // Exclude closed sessions
        },
        select: { sessionId: true },
      });
      const currentSessionIds = waiterSessions.map(session => session.sessionId);

      // Combine session IDs from both sources
      const allRelevantSessionIds = [...new Set([...sessionIdsFromActivity, ...currentSessionIds])];
      
      this.logger.log(`Combined relevant sessions for waiter ${waiterId}: ${allRelevantSessionIds.length} sessions`);

      // Get ALL requests from these sessions (not limited by creation date)
      const allRequests = await this.prisma.request.findMany({
        where: {
          sessionId: { in: allRelevantSessionIds }
        },
        orderBy: { createdAt: 'asc' }
      });

      this.logger.log(`Found ${allRequests.length} total requests in relevant sessions for waiter ${waiterId}`);

      // Get request logs for response time calculation
      const requestLogs = await this.prisma.requestLog.findMany({
        where: {
          requestId: { in: allRequests.map(r => r.id) }
        }
      });

      // Get service analysis data for customer sentiment using session-aware filtering
      // First get all service analysis for today, then filter by session timeline responsibility
      const allServiceAnalysisData = await this.prisma.serviceAnalysis.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lt: new Date(endDate),
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

      // Filter service analysis data based on session timeline responsibility
      const sessionIdsForAnalysis = [...new Set(allServiceAnalysisData.map(analysis => analysis.sessionId))];
      const sessionTimelinesForAnalysis = await Promise.all(
        sessionIdsForAnalysis.map(sessionId => this.reconstructSessionTimeline(sessionId, new Date(startDate), new Date(endDate)))
      );

      const attributedServiceAnalysisData = allServiceAnalysisData.filter(analysis => {
        const sessionTimeline = sessionTimelinesForAnalysis.find(timeline => 
          timeline.some(period => period.waiterId === waiterId)
        );

        if (sessionTimeline) {
          const waiterPeriod = sessionTimeline.find(period => 
            period.waiterId === waiterId &&
            analysis.createdAt >= period.startTime && 
            analysis.createdAt <= period.endTime
          );
          return !!waiterPeriod;
        }
        return false;
      });

      this.logger.log(`Session-aware service analysis for waiter ${waiterId}: ${attributedServiceAnalysisData.length} attributed from ${allServiceAnalysisData.length} total today`);

      this.logger.log(`Found ${allRequests.length} requests and ${attributedServiceAnalysisData.length} attributed service analysis records for waiter ${waiterId} today`);

      // Calculate session-aware request management metrics with accurate attribution
      const requestMetrics = await this.calculateSessionAwareRequestMetrics(
        waiterId, 
        allRequests, 
        requestLogs, 
        new Date(startDate), 
        new Date(endDate)
      );
      
      this.logger.log(`Session-aware metrics for waiter ${waiterId}: ${requestMetrics.totalRequests} attributed requests`);
      
      // Analyze session activity patterns
      const sessionActivityMetrics = await this.analyzeSessionActivityPatterns(
        waiterId,
        new Date(startDate),
        new Date(endDate)
      );

      // Analyze session-aware order management metrics
      const orderMetrics = await this.analyzeSessionAwareOrderMetrics(
        waiterId,
        new Date(startDate),
        new Date(endDate)
      );
      
      this.logger.log(`Session-aware order metrics for waiter ${waiterId}: ${orderMetrics.totalOrders} attributed orders`);
      
      // Prepare customer sentiment data
      const customerSentimentData = this.prepareCustomerSentimentData(attributedServiceAnalysisData);

      // Generate comprehensive analysis with session context including order metrics
      return await this.generateComprehensiveAnalysis(requestMetrics, customerSentimentData, waiterId, sessionActivityMetrics, orderMetrics);

    } catch (error) {
      this.logger.error(`Error generating AI analysis: ${error.message}`, error.stack);
      
      // If it's an AI unavailable error, rethrow it
      if (error.message.includes('AI analysis is temporarily unavailable')) {
        throw error;
      }
      
      // For other errors, throw a generic unavailability message
      throw new Error('Performance analysis is temporarily unavailable. Please try again later.');
    }
  }

  /**
   * Create a new service analysis (replaces waiter rating)
   * @param dto Service analysis data
   * @returns Created service analysis
   */
  async createRating(dto: any): Promise<any> {
    try {
      // Calculate overall rating from the individual metrics or use provided rating
      const overallRating = dto.rating || Math.round(
        (dto.friendliness + dto.orderAccuracy + dto.speed + dto.attentiveness + dto.knowledge) / 5
      );

      const serviceAnalysis = await this.prisma.serviceAnalysis.create({
        data: {
          sessionId: dto.sessionId || `session-${Date.now()}`, // Generate session ID if not provided
          userId: dto.userId,
          waiterId: dto.waiterId,
          serviceType: dto.serviceType || 'request', // Default to 'request'
          rating: overallRating,
          analysis: {
            friendliness: dto.friendliness,
            orderAccuracy: dto.orderAccuracy,
            speed: dto.speed,
            attentiveness: dto.attentiveness,
            knowledge: dto.knowledge,
            comment: dto.comment,
            overallRating: overallRating
          }
        },
      });

      return serviceAnalysis;
    } catch (error) {
      this.logger.error(`Error creating service analysis: ${error.message}`, error.stack);
      throw new Error(`Failed to create service analysis: ${error.message}`);
    }
  }

  /**
   * Get allocated tables for the current waiter
   * @param waiterId Waiter ID
   * @returns Array of all table numbers (simplified without shift logic)
   */
  private async getWaiterAllocatedTables(waiterId: string): Promise<number[]> {
    try {
      console.log(`[WaiterService] getWaiterAllocatedTables for waiterId: ${waiterId} - returning all tables`);
      
      // Simplified: Return all possible table numbers (1-20 as example)
      // This removes the complex shift-based table allocation system
      const allTables = Array.from({ length: 20 }, (_, i) => i + 1);
      
      console.log(`[WaiterService] Returning all tables:`, allTables);
      return allTables;
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
        where: { 
          waiterId: waiterId,
          sessionId: { not: { startsWith: 'CLOSED_' } } // Exclude closed sessions
        },
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
        where: { 
          waiterId: waiterId,
          sessionId: { not: { startsWith: 'CLOSED_' } } // Exclude closed sessions
        },
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

      const userRole = this.getUserRole();
      return this.ordersService.updateOrderStatus(id, status, userRole);
    } catch (error) {
      this.logger.error(`Error updating order status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Session Logging Helper Methods                                             */
  /* -------------------------------------------------------------------------- */

  /**
   * Log session activity for analytics and audit trail
   * @param sessionId The session ID
   * @param action The action performed
   * @param actorId The ID of the actor (waiter/user)
   * @param actorType The type of actor (waiter/user/system)
   * @param details Additional details about the action
   * @param dateTime Optional timestamp override (uses current Johannesburg time if not provided)
   */
  private async logSessionActivity(
    sessionId: string, 
    action: string, 
    actorId: string | null = null, 
    actorType: string | null = null, 
    details: any = null,
    dateTime?: Date
  ): Promise<void> {
    try {
      // Use DateUtil.now() for consistent Johannesburg timezone handling
      const logTime = dateTime || DateUtil.now();
      
      await this.prisma.userSessionLog.create({
        data: {
          sessionId,
          action,
          dateTime: logTime,
          actorId,
          actorType,
          details: details ? JSON.parse(JSON.stringify(details)) : null,
        },
      });
      
      this.logger.log(`Session activity logged: ${action} for session ${sessionId} by ${actorType} ${actorId} at ${logTime.toISOString()}`);
    } catch (error) {
      this.logger.error(`Failed to log session activity: ${error.message}`, error.stack);
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Get session activity logs for analytics
   * @param sessionId The session ID to get logs for
   * @returns Array of session activity logs
   */
  async getSessionActivityLogs(sessionId: string): Promise<any[]> {
    try {
      const logs = await this.prisma.userSessionLog.findMany({
        where: { sessionId },
        orderBy: { dateTime: 'asc' },
      });

      return logs;
    } catch (error) {
      this.logger.error(`Failed to get session activity logs: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Get waiter's active session periods for accurate analytics
   * @param waiterId The waiter ID
   * @param sessionId The session ID
   * @returns Array of time periods when this waiter was responsible for the session
   */
  async getWaiterSessionPeriods(waiterId: string, sessionId: string): Promise<Array<{startTime: Date, endTime: Date | null}>> {
    try {
      const logs = await this.prisma.userSessionLog.findMany({
        where: {
          sessionId,
          OR: [
            { action: 'created_session', actorId: waiterId },
            { action: 'transferred_session_to', actorId: waiterId },
            { action: 'transferred_session_from', actorId: waiterId },
          ]
        },
        orderBy: { dateTime: 'asc' },
      });

      const periods: Array<{startTime: Date, endTime: Date | null}> = [];
      let currentPeriodStart: Date | null = null;

      for (const log of logs) {
        if (log.action === 'created_session' || log.action === 'transferred_session_to') {
          // Waiter started managing this session
          currentPeriodStart = log.dateTime;
        } else if (log.action === 'transferred_session_from' && currentPeriodStart) {
          // Waiter stopped managing this session
          periods.push({
            startTime: currentPeriodStart,
            endTime: log.dateTime,
          });
          currentPeriodStart = null;
        }
      }

      // If there's an ongoing period (waiter is still managing the session)
      if (currentPeriodStart) {
        periods.push({
          startTime: currentPeriodStart,
          endTime: null, // Still active
        });
      }

      return periods;
    } catch (error) {
      this.logger.error(`Failed to get waiter session periods: ${error.message}`, error.stack);
      return [];
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
        where: {
          userType: 'waiter', // Only include waiters with userType 'waiter'
        },
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
      // First check cache for all active sessions
      const cachedSessions = await this.sessionCache.getAllActiveSessions();
      if (cachedSessions) {
        this.logger.log(`Retrieved ${cachedSessions.length} cached active sessions`);
        return cachedSessions;
      }

      // Cache miss - fetch from database
      const sessions = await this.prisma.user.findMany({
        where: {
          sessionId: { not: { startsWith: 'CLOSED_' } } // Exclude closed sessions
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

      // Cache the results for faster subsequent queries
      await this.sessionCache.setAllActiveSessions(sessions);

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
      // First check cache for active sessions
      const cachedSessions = await this.sessionCache.getActiveSessions(waiterId);
      if (cachedSessions) {
        this.logger.log(`Retrieved ${cachedSessions.length} cached active sessions for waiter ${waiterId}`);
        return cachedSessions;
      }

      // Cache miss - fetch from database
      const sessions = await this.prisma.user.findMany({
        where: {
          waiterId: waiterId,
          sessionId: { not: { startsWith: 'CLOSED_' } } // Exclude closed sessions
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

      // Cache the results for faster subsequent queries
      await this.sessionCache.setActiveSessions(waiterId, sessionsWithCounts);

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
      // Verify the session belongs to this waiter and is not closed
      const session = await this.prisma.user.findFirst({
        where: {
          sessionId: sessionId,
          waiterId: waiterId, // Ensure session belongs to this waiter
          NOT: { sessionId: { startsWith: 'CLOSED_' } } // Exclude closed sessions
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
        include: { restaurant: true },
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
          restaurantId: waiter.restaurantId,
        },
      });

      // Cache the new session with 30 minute TTL
      await this.sessionCache.set(user.id, user);
      this.logger.log(`Cached new session ${sessionId} for user ${user.id}`);

      // Log session creation activity with the same timestamp as the user creation
      await this.logSessionActivity(
        sessionId,
        'session_created', // Fixed action name to match timeline reconstruction
        waiterId,
        'waiter',
        {
          tableNumber,
          waiterName: `${waiter.name} ${waiter.surname}`,
          restaurantId: waiter.restaurantId,
        },
        user.createdAt // Use the exact timestamp from user creation for synchronization
      );

      // Invalidate active sessions caches to force refresh
      await this.sessionCache.invalidateActiveSessions(waiterId);
      await this.sessionCache.invalidateAllActiveSessions();

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
          userId: user.id,
          name: user.name,
          tableNumber: user.tableNumber,
          sessionId: user.sessionId,
          waiterId: user.waiterId,
          createdAt: user.createdAt,
          restaurantId: user.restaurantId,
        },
      });

      // Instead of deleting the user (which causes foreign key violations),
      // we'll mark the session as closed by updating the sessionId to indicate closure
      // This preserves data integrity while marking the session as inactive
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          sessionId: `CLOSED_${user.sessionId}_${Date.now()}`, // Mark as closed with timestamp
        },
      });

      // Log session closure activity
      await this.logSessionActivity(
        user.sessionId,
        'closed_session',
        user.waiterId,
        'waiter',
        {
          tableNumber: user.tableNumber,
          waiterName: user.waiter ? `${user.waiter.name} ${user.waiter.surname}` : 'Unknown',
          closedAt: new Date(),
        }
      );

      // Invalidate session cache for this user
      await this.sessionCache.invalidate(user.id);
      this.logger.log(`Invalidated session cache for user ${user.id} on table close`);

      // Invalidate active sessions caches to force refresh
      if (user.waiterId) {
        await this.sessionCache.invalidateActiveSessions(user.waiterId);
      }
      await this.sessionCache.invalidateAllActiveSessions();

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

  /**
   * Reconstruct waiter responsibility timeline for accurate activity attribution
   * @param sessionId The session ID to reconstruct timeline for
   * @param startDate Analysis start date
   * @param endDate Analysis end date
   * @returns Array of responsibility periods with waiter and time ranges
   */
  private async reconstructSessionTimeline(sessionId: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // Get all session activity logs for this session within the date range
      const sessionLogs = await this.prisma.userSessionLog.findMany({
        where: {
          sessionId: sessionId,
          dateTime: {
            gte: startDate,
            lte: endDate,
          },
          action: {
            in: ['session_created', 'transferred_session_from', 'transferred_session_to', 'session_closed']
          }
        },
        orderBy: {
          dateTime: 'asc'
        }
      });

      if (sessionLogs.length === 0) {
        return [];
      }

      const timeline: any[] = [];
      let currentWaiter: string | null = null;
      let periodStart: Date | null = null;

      for (const log of sessionLogs) {
        if (log.action === 'session_created') {
          currentWaiter = log.actorId;
          periodStart = log.dateTime;
        } else if (log.action === 'transferred_session_from') {
          // End current period for transferring waiter
          if (currentWaiter && periodStart) {
            timeline.push({
              waiterId: currentWaiter,
              startTime: periodStart,
              endTime: log.dateTime,
              duration: log.dateTime.getTime() - periodStart.getTime()
            });
          }
          currentWaiter = null;
          periodStart = null;
        } else if (log.action === 'transferred_session_to') {
          // Start new period for receiving waiter
          currentWaiter = log.actorId;
          periodStart = log.dateTime;
        } else if (log.action === 'session_closed') {
          // End current period
          if (currentWaiter && periodStart) {
            timeline.push({
              waiterId: currentWaiter,
              startTime: periodStart,
              endTime: log.dateTime,
              duration: log.dateTime.getTime() - periodStart.getTime()
            });
          }
          currentWaiter = null;
          periodStart = null;
        }
      }

      // If session is still ongoing, extend to analysis end date
      if (currentWaiter && periodStart) {
        timeline.push({
          waiterId: currentWaiter,
          startTime: periodStart,
          endTime: endDate,
          duration: endDate.getTime() - periodStart.getTime()
        });
      }

      return timeline;
    } catch (error) {
      this.logger.error(`Error reconstructing session timeline: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate session-aware request metrics with accurate waiter attribution
   */
  private async calculateSessionAwareRequestMetrics(waiterId: string, requests: any[], requestLogs: any[], startDate: Date, endDate: Date): Promise<any> {
    if (requests.length === 0) {
      return {
        totalRequests: 0,
        completedRequests: 0,
        completionRate: 0,
        avgResponseTime: 0,
        avgCompletionTime: 0,
        responseTimes: [],
        completionTimes: [],
        statusBreakdown: {},
        sessionMetrics: {
          totalSessionTime: 0,
          transfersReceived: 0,
          transfersGiven: 0,
          uniqueSessionsHandled: 0
        }
      };
    }

    // Get unique session IDs from requests
    const sessionIds = [...new Set(requests.map(req => req.sessionId))];
    
    // Reconstruct timeline for each session
    const sessionTimelines = await Promise.all(
      sessionIds.map(sessionId => this.reconstructSessionTimeline(sessionId, startDate, endDate))
    );

    // Calculate metrics only for requests during waiter's responsibility period
    let attributedRequests = 0;
    let completedRequests = 0;
    const responseTimes: number[] = [];
    const completionTimes: number[] = [];
    const statusBreakdown: Record<string, number> = {};
    
    // Session management metrics
    let totalSessionTime = 0;
    let transfersReceived = 0;
    let transfersGiven = 0;
    const uniqueSessionsHandled = new Set<string>();

    // Process each request with timeline-based attribution
    for (const request of requests) {
      const sessionTimeline = sessionTimelines.find(timeline => 
        timeline.some(period => period.waiterId === waiterId && 
          new Date(request.createdAt) >= period.startTime && 
          new Date(request.createdAt) <= period.endTime)
      );

      if (sessionTimeline) {
        const waiterPeriod = sessionTimeline.find(period => 
          period.waiterId === waiterId &&
          new Date(request.createdAt) >= period.startTime && 
          new Date(request.createdAt) <= period.endTime
        );

        if (waiterPeriod) {
          attributedRequests++;
          uniqueSessionsHandled.add(request.sessionId);

          // Count status breakdown
          statusBreakdown[request.status] = (statusBreakdown[request.status] || 0) + 1;
          
          if (request.status === 'Done') {
            completedRequests++;
          }

          // Calculate response and completion times using session-aware request log analysis
          const logsForRequest = requestLogs.filter(log => log.requestId === request.id);
          
          if (logsForRequest.length > 0) {
            // Sort logs by dateTime to get proper sequence
            logsForRequest.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
            
            // Find first acknowledgment/response action by this waiter during their responsibility period
            const firstResponseLog = logsForRequest.find(log => 
              (log.action.includes('acknowledged') || log.action.includes('Status changed') || log.actor === 'waiter') &&
              new Date(log.dateTime) >= waiterPeriod.startTime &&
              new Date(log.dateTime) <= waiterPeriod.endTime
            );
            
            if (firstResponseLog) {
              const responseTime = new Date(firstResponseLog.dateTime).getTime() - new Date(request.createdAt).getTime();
              responseTimes.push(responseTime / (1000 * 60)); // Convert to minutes
            }

            // Find completion log during waiter's responsibility period
            if (request.status === 'Done') {
              const completionLog = logsForRequest.find(log => 
                (log.action.includes('completed') || log.action.includes('Done') || log.action.includes('Status changed from') && log.action.includes('to Done')) &&
                new Date(log.dateTime) >= waiterPeriod.startTime &&
                new Date(log.dateTime) <= waiterPeriod.endTime
              );
              
              if (completionLog) {
                const completionTime = new Date(completionLog.dateTime).getTime() - new Date(request.createdAt).getTime();
                completionTimes.push(completionTime / (1000 * 60)); // Convert to minutes
              }
            }
          }
        }
      }
    }

    // Calculate session management metrics
    for (const timeline of sessionTimelines) {
      for (const period of timeline) {
        if (period.waiterId === waiterId) {
          totalSessionTime += period.duration;
          uniqueSessionsHandled.add(period.sessionId);
        }
      }
    }

    // Count transfers from session logs
    const sessionLogs = await this.prisma.userSessionLog.findMany({
      where: {
        sessionId: { in: sessionIds },
        dateTime: { gte: startDate, lte: endDate },
        action: { in: ['transferred_session_from', 'transferred_session_to'] },
        actorId: waiterId
      }
    });

    transfersReceived = sessionLogs.filter(log => log.action === 'transferred_session_to').length;
    transfersGiven = sessionLogs.filter(log => log.action === 'transferred_session_from').length;

    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    
    const avgCompletionTime = completionTimes.length > 0 ? 
      completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length : 0;

    return {
      totalRequests: attributedRequests,
      completedRequests,
      completionRate: attributedRequests > 0 ? (completedRequests / attributedRequests) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      avgCompletionTime: Math.round(avgCompletionTime * 100) / 100,
      responseTimes,
      completionTimes,
      statusBreakdown,
      sessionMetrics: {
        totalSessionTime: Math.round(totalSessionTime / (1000 * 60)), // Convert to minutes
        transfersReceived,
        transfersGiven,
        uniqueSessionsHandled: uniqueSessionsHandled.size
      }
    };
  }

  /**
   * Analyze session activity patterns and performance metrics
   */
  private async analyzeSessionActivityPatterns(waiterId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      // Get all session activity logs for this waiter
      const waiterSessionLogs = await this.prisma.userSessionLog.findMany({
        where: {
          actorId: waiterId,
          actorType: 'waiter',
          dateTime: { gte: startDate, lte: endDate }
        },
        orderBy: { dateTime: 'asc' }
      });

      if (waiterSessionLogs.length === 0) {
        return {
          sessionsCreated: 0,
          sessionsClosed: 0,
          transfersReceived: 0,
          transfersGiven: 0,
          avgSessionDuration: 0,
          totalActiveTime: 0,
          workloadDistribution: {},
          transferPatterns: {
            peakTransferTimes: [],
            transferReasons: [],
            transferFrequency: 0
          },
          performanceInsights: []
        };
      }

      // Categorize activities
      const sessionsCreated = waiterSessionLogs.filter(log => log.action === 'session_created').length;
      const sessionsClosed = waiterSessionLogs.filter(log => log.action === 'session_closed').length;
      const transfersReceived = waiterSessionLogs.filter(log => log.action === 'transferred_session_to').length;
      const transfersGiven = waiterSessionLogs.filter(log => log.action === 'transferred_session_from').length;

      // Calculate session durations for sessions this waiter handled
      const sessionDurations: number[] = [];
      const uniqueSessions = [...new Set(waiterSessionLogs.map(log => log.sessionId))];
      
      for (const sessionId of uniqueSessions) {
        const sessionTimeline = await this.reconstructSessionTimeline(sessionId, startDate, endDate);
        const waiterPeriods = sessionTimeline.filter(period => period.waiterId === waiterId);
        
        for (const period of waiterPeriods) {
          sessionDurations.push(period.duration / (1000 * 60)); // Convert to minutes
        }
      }

      const avgSessionDuration = sessionDurations.length > 0 ? 
        sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length : 0;
      
      const totalActiveTime = sessionDurations.reduce((a, b) => a + b, 0);

      // Analyze workload distribution by hour
      const workloadDistribution: Record<string, number> = {};
      waiterSessionLogs.forEach(log => {
        const hour = log.dateTime.getHours();
        const key = `${hour}:00-${hour + 1}:00`;
        workloadDistribution[key] = (workloadDistribution[key] || 0) + 1;
      });

      // Analyze transfer patterns
      const transferLogs = waiterSessionLogs.filter(log => 
        log.action === 'transferred_session_from' || log.action === 'transferred_session_to'
      );

      const peakTransferTimes: string[] = [];
      const transfersByHour: Record<number, number> = {};
      
      transferLogs.forEach(log => {
        const hour = log.dateTime.getHours();
        transfersByHour[hour] = (transfersByHour[hour] || 0) + 1;
      });

      // Find peak transfer hours
      const maxTransfers = Math.max(...Object.values(transfersByHour));
      Object.entries(transfersByHour).forEach(([hour, count]) => {
        if (count === maxTransfers && maxTransfers > 0) {
          peakTransferTimes.push(`${hour}:00-${parseInt(hour) + 1}:00`);
        }
      });

      // Extract transfer reasons from details
      const transferReasons: string[] = [];
      transferLogs.forEach(log => {
        if (log.details && typeof log.details === 'object') {
          const details = log.details as any;
          if (details.transferType) {
            transferReasons.push(details.transferType);
          }
        }
      });

      const transferFrequency = transferLogs.length;

      // Generate performance insights
      const performanceInsights: string[] = [];
      
      if (transfersReceived > transfersGiven * 2) {
        performanceInsights.push('High incoming transfer rate - may indicate strong performance or colleagues seeking help');
      }
      
      if (transfersGiven > transfersReceived * 2) {
        performanceInsights.push('High outgoing transfer rate - consider workload management strategies');
      }
      
      if (avgSessionDuration > 120) { // More than 2 hours
        performanceInsights.push('Long average session duration - excellent customer engagement');
      } else if (avgSessionDuration < 30) { // Less than 30 minutes
        performanceInsights.push('Short session duration - focus on customer retention strategies');
      }

      if (Object.keys(workloadDistribution).length > 8) {
        performanceInsights.push('Active across multiple time periods - consistent service delivery');
      }

      return {
        sessionsCreated,
        sessionsClosed,
        transfersReceived,
        transfersGiven,
        avgSessionDuration: Math.round(avgSessionDuration * 100) / 100,
        totalActiveTime: Math.round(totalActiveTime * 100) / 100,
        workloadDistribution,
        transferPatterns: {
          peakTransferTimes,
          transferReasons: [...new Set(transferReasons)],
          transferFrequency
        },
        performanceInsights
      };
    } catch (error) {
      this.logger.error(`Error analyzing session activity patterns: ${error.message}`);
      return {
        sessionsCreated: 0,
        sessionsClosed: 0,
        transfersReceived: 0,
        transfersGiven: 0,
        avgSessionDuration: 0,
        totalActiveTime: 0,
        workloadDistribution: {},
        transferPatterns: {
          peakTransferTimes: [],
          transferReasons: [],
          transferFrequency: 0
        },
        performanceInsights: []
      };
    }
  }

  /**
   * Calculate request management metrics
   */
  private calculateRequestMetrics(requests: any[], requestLogs: any[]): any {
    if (requests.length === 0) {
      return {
        totalRequests: 0,
        completedRequests: 0,
        completionRate: 0,
        avgResponseTime: 0,
        avgCompletionTime: 0,
        responseTimes: [],
        completionTimes: [],
        statusBreakdown: {}
      };
    }

    let completedRequests = 0;
    const responseTimes: number[] = [];
    const completionTimes: number[] = [];
    const statusBreakdown: Record<string, number> = {};

    requests.forEach(request => {
      // Count status breakdown
      statusBreakdown[request.status] = (statusBreakdown[request.status] || 0) + 1;
      
      if (request.status === 'Done') {
        completedRequests++;
      }

      // Find logs for this request
      const logsForRequest = requestLogs.filter(log => log.requestId === request.id);
      
      // Calculate response time (time from request creation to first waiter action)
      if (logsForRequest.length > 0) {
        const firstWaiterLog = logsForRequest.find(log => 
          log.newStatus !== 'New' && log.newStatus !== logsForRequest[0]?.newStatus
        );
        
        if (firstWaiterLog) {
          const responseTime = new Date(firstWaiterLog.createdAt).getTime() - new Date(request.createdAt).getTime();
          responseTimes.push(responseTime / (1000 * 60)); // Convert to minutes
        }

        // Calculate completion time (time from 'New' to 'Done')
        if (request.status === 'Done') {
          const completionTime = new Date(request.updatedAt).getTime() - new Date(request.createdAt).getTime();
          completionTimes.push(completionTime / (1000 * 60)); // Convert to minutes
        }
      }
    });

    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    
    const avgCompletionTime = completionTimes.length > 0 ? 
      completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length : 0;

    return {
      totalRequests: requests.length,
      completedRequests,
      completionRate: requests.length > 0 ? (completedRequests / requests.length) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      avgCompletionTime: Math.round(avgCompletionTime * 100) / 100,
      responseTimes,
      completionTimes,
      statusBreakdown
    };
  }

  /**
   * Prepare customer sentiment data
   */
  private prepareCustomerSentimentData(serviceAnalysisData: any[]): any {
    if (serviceAnalysisData.length === 0) {
      return {
        available: false,
        count: 0,
        message: 'No customer feedback yet for today'
      };
    }

    const analysisContent = serviceAnalysisData.map((item: any, index: number) => {
      const analysis = item.analysis as any;
      const rating = item.rating || 3;
      const comment = analysis.comment || 'No comment provided';
      
      return `Review ${index + 1} (Table ${item.user?.tableNumber || 'Unknown'}):
- Overall Rating: ${rating}
- Individual Ratings: Friendliness: ${analysis.friendliness}, Order Accuracy: ${analysis.orderAccuracy}, Speed: ${analysis.speed}, Attentiveness: ${analysis.attentiveness}, Knowledge: ${analysis.knowledge}
- Customer Comment: "${comment}"
---`;
    }).join('\n');

    return {
      available: true,
      count: serviceAnalysisData.length,
      content: analysisContent
    };
  }

  /**
   * Analyze orders_log data with session timeline awareness
   * Only includes order management actions during waiter's responsibility periods
   */
  private async analyzeSessionAwareOrderMetrics(waiterId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      // Get all orders from sessions where this waiter had activity today
      const waiterSessionActivity = await this.prisma.userSessionLog.findMany({
        where: {
          actorId: waiterId,
          actorType: 'waiter',
          dateTime: {
            gte: startDate,
            lte: endDate,
          }
        },
        select: { sessionId: true },
        distinct: ['sessionId']
      });

      const sessionIdsFromActivity = waiterSessionActivity.map(activity => activity.sessionId);
      
      if (sessionIdsFromActivity.length === 0) {
        return {
          totalOrders: 0,
          ordersProcessed: 0,
          avgOrderProcessingTime: 0,
          statusChangeFrequency: {},
          orderStatusBreakdown: {},
          orderEfficiencyMetrics: {
            fastProcessedOrders: 0,
            delayedOrders: 0,
            avgTimeToAcknowledge: 0,
            avgTimeToComplete: 0
          }
        };
      }

      // Get all orders from relevant sessions
      const allOrders = await this.prisma.order.findMany({
        where: {
          sessionId: { in: sessionIdsFromActivity }
        },
        include: {
          logs: {
            orderBy: { dateTime: 'asc' }
          }
        }
      });

      if (allOrders.length === 0) {
        return {
          totalOrders: 0,
          ordersProcessed: 0,
          avgOrderProcessingTime: 0,
          statusChangeFrequency: {},
          orderStatusBreakdown: {},
          orderEfficiencyMetrics: {
            fastProcessedOrders: 0,
            delayedOrders: 0,
            avgTimeToAcknowledge: 0,
            avgTimeToComplete: 0
          }
        };
      }

      // Reconstruct session timelines for these sessions
      const uniqueSessionIds = [...new Set(allOrders.map(order => order.sessionId))];
      const sessionTimelines = await Promise.all(
        uniqueSessionIds.map(sessionId => this.reconstructSessionTimeline(sessionId, startDate, endDate))
      );

      let attributedOrders = 0;
      let ordersProcessed = 0;
      const processingTimes: number[] = [];
      const acknowledgmentTimes: number[] = [];
      const completionTimes: number[] = [];
      const statusChangeFrequency: Record<string, number> = {};
      const orderStatusBreakdown: Record<string, number> = {};
      let fastProcessedOrders = 0;
      let delayedOrders = 0;

      // Analyze each order with session timeline attribution
      for (const order of allOrders) {
        const sessionTimeline = sessionTimelines.find(timeline => 
          timeline.some(period => period.waiterId === waiterId)
        );

        if (!sessionTimeline) continue;

        // Check if this order was created or processed during waiter's responsibility
        const orderCreationTime = new Date(order.createdAt);
        const orderUpdateTime = new Date(order.updatedAt);

        const waiterPeriodForCreation = sessionTimeline.find(period => 
          period.waiterId === waiterId &&
          orderCreationTime >= period.startTime && 
          orderCreationTime <= period.endTime
        );

        const waiterPeriodForUpdate = sessionTimeline.find(period => 
          period.waiterId === waiterId &&
          orderUpdateTime >= period.startTime && 
          orderUpdateTime <= period.endTime
        );

        // If order was created or updated during waiter's responsibility, attribute it
        if (waiterPeriodForCreation || waiterPeriodForUpdate) {
          attributedOrders++;
          
          // Count status breakdown
          orderStatusBreakdown[order.status] = (orderStatusBreakdown[order.status] || 0) + 1;

          if (order.status !== 'New') {
            ordersProcessed++;
          }

          // Analyze order logs during waiter's responsibility periods
          const attributedLogs = order.logs.filter(log => {
            const logTime = new Date(log.dateTime);
            return sessionTimeline.some(period => 
              period.waiterId === waiterId &&
              logTime >= period.startTime && 
              logTime <= period.endTime
            );
          });

          // Count status change frequency
          attributedLogs.forEach(log => {
            if (log.action.includes('Status changed')) {
              const statusChange = log.action;
              statusChangeFrequency[statusChange] = (statusChangeFrequency[statusChange] || 0) + 1;
            }
          });

          // Calculate timing metrics
          if (attributedLogs.length > 0) {
            // Time to first acknowledgment
            const firstAckLog = attributedLogs.find(log => 
              log.action.includes('acknowledged') || log.action.includes('Status changed from New')
            );
            if (firstAckLog) {
              const ackTime = new Date(firstAckLog.dateTime).getTime() - orderCreationTime.getTime();
              acknowledgmentTimes.push(ackTime / (1000 * 60)); // Convert to minutes
            }

            // Time to completion
            const completionLog = attributedLogs.find(log => 
              log.action.includes('completed') || log.action.includes('to Done') || log.action.includes('to Served')
            );
            if (completionLog) {
              const compTime = new Date(completionLog.dateTime).getTime() - orderCreationTime.getTime();
              completionTimes.push(compTime / (1000 * 60)); // Convert to minutes

              // Classify as fast or delayed (arbitrary thresholds - can be adjusted)
              if (compTime <= 15 * 60 * 1000) { // 15 minutes
                fastProcessedOrders++;
              } else if (compTime > 30 * 60 * 1000) { // 30 minutes
                delayedOrders++;
              }
            }

            // Overall processing time (from creation to last update during waiter period)
            const lastLog = attributedLogs[attributedLogs.length - 1];
            if (lastLog) {
              const procTime = new Date(lastLog.dateTime).getTime() - orderCreationTime.getTime();
              processingTimes.push(procTime / (1000 * 60)); // Convert to minutes
            }
          }
        }
      }

      const avgOrderProcessingTime = processingTimes.length > 0 ? 
        processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0;

      const avgTimeToAcknowledge = acknowledgmentTimes.length > 0 ? 
        acknowledgmentTimes.reduce((a, b) => a + b, 0) / acknowledgmentTimes.length : 0;

      const avgTimeToComplete = completionTimes.length > 0 ? 
        completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length : 0;

      this.logger.log(`Session-aware order metrics for waiter ${waiterId}: ${attributedOrders} attributed orders, ${ordersProcessed} processed`);

      return {
        totalOrders: attributedOrders,
        ordersProcessed,
        avgOrderProcessingTime: Math.round(avgOrderProcessingTime * 100) / 100,
        statusChangeFrequency,
        orderStatusBreakdown,
        orderEfficiencyMetrics: {
          fastProcessedOrders,
          delayedOrders,
          avgTimeToAcknowledge: Math.round(avgTimeToAcknowledge * 100) / 100,
          avgTimeToComplete: Math.round(avgTimeToComplete * 100) / 100,
          orderProcessingTimes: processingTimes,
          acknowledgmentTimes,
          completionTimes
        }
      };
    } catch (error) {
      this.logger.error(`Error analyzing session-aware order metrics: ${error.message}`, error.stack);
      return {
        totalOrders: 0,
        ordersProcessed: 0,
        avgOrderProcessingTime: 0,
        statusChangeFrequency: {},
        orderStatusBreakdown: {},
        orderEfficiencyMetrics: {
          fastProcessedOrders: 0,
          delayedOrders: 0,
          avgTimeToAcknowledge: 0,
          avgTimeToComplete: 0
        }
      };
    }
  }

  /**
   * Generate comprehensive AI analysis combining request metrics, customer sentiment, and session activity data
   */
  private async generateComprehensiveAnalysis(requestMetrics: any, customerSentimentData: any, waiterId: string, sessionActivityMetrics?: any, orderMetrics?: any): Promise<any> {
    const sessionContext = sessionActivityMetrics ? `

SESSION MANAGEMENT DATA:
- Sessions Created Today: ${sessionActivityMetrics.sessionsCreated}
- Sessions Closed Today: ${sessionActivityMetrics.sessionsClosed}
- Total Active Session Time: ${sessionActivityMetrics.totalActiveTime.toFixed(1)} minutes
- Average Session Duration: ${sessionActivityMetrics.avgSessionDuration.toFixed(1)} minutes
- Transfers Received: ${sessionActivityMetrics.transfersReceived}
- Transfers Given: ${sessionActivityMetrics.transfersGiven}
- Unique Sessions Handled: ${sessionActivityMetrics.sessionsCreated + sessionActivityMetrics.transfersReceived}
- Session Activity Insights: ${sessionActivityMetrics.performanceInsights.join(', ') || 'No specific patterns identified'}
- Workload Distribution: Peak activity periods ${Object.entries(sessionActivityMetrics.workloadDistribution).filter(([_, count]) => (count as number) >= 2).map(([time]) => time).join(', ') || 'Evenly distributed'}
- Transfer Patterns: ${sessionActivityMetrics.transferPatterns.transferFrequency > 0 ? 
  `${sessionActivityMetrics.transferPatterns.transferFrequency} transfers, peak times: ${sessionActivityMetrics.transferPatterns.peakTransferTimes.join(', ') || 'No pattern'}` : 
  'No transfers today'}` : '';

    const orderContext = orderMetrics ? `

ORDER MANAGEMENT DATA (Session-Aware Attribution):
- Total Orders Today: ${orderMetrics.totalOrders}
- Orders Processed: ${orderMetrics.ordersProcessed}
- Order Processing Rate: ${orderMetrics.totalOrders > 0 ? ((orderMetrics.ordersProcessed / orderMetrics.totalOrders) * 100).toFixed(1) : 0}%
- Average Processing Time: ${orderMetrics.avgOrderProcessingTime} minutes
- Fast Processed Orders: ${orderMetrics.orderEfficiencyMetrics.fastProcessedOrders}
- Delayed Orders: ${orderMetrics.orderEfficiencyMetrics.delayedOrders}
- Average Time to Acknowledge: ${orderMetrics.orderEfficiencyMetrics.avgTimeToAcknowledge} minutes
- Average Time to Complete: ${orderMetrics.orderEfficiencyMetrics.avgTimeToComplete} minutes
- Order Status Breakdown: ${JSON.stringify(orderMetrics.orderStatusBreakdown)}
- Status Change Activity: ${JSON.stringify(orderMetrics.statusChangeFrequency)}` : '';

    const prompt = `Today's date is: ${new Date().toISOString().split('T')[0]}. You are an AI assistant analyzing a waiter's daily performance. Provide insights on request management, customer satisfaction, order management, and session management.

REQUEST MANAGEMENT DATA (Session-Aware Attribution):
- Total Requests Today: ${requestMetrics.totalRequests}
- Completed Requests: ${requestMetrics.completedRequests}
- Completion Rate: ${requestMetrics.completionRate.toFixed(1)}%
- Average Response Time: ${requestMetrics.avgResponseTime} minutes
- Average Completion Time: ${requestMetrics.avgCompletionTime} minutes
- Status Breakdown: ${JSON.stringify(requestMetrics.statusBreakdown)}
${requestMetrics.sessionMetrics ? `
- Session Time Worked: ${requestMetrics.sessionMetrics.totalSessionTime} minutes
- Sessions with Activity: ${requestMetrics.sessionMetrics.uniqueSessionsHandled}
- Session Transfers Received: ${requestMetrics.sessionMetrics.transfersReceived}
- Session Transfers Given: ${requestMetrics.sessionMetrics.transfersGiven}` : ''}${orderContext}${sessionContext}

CUSTOMER SENTIMENT DATA:
${customerSentimentData.available ? customerSentimentData.content : 'No customer feedback available today'}

Please respond with a JSON object containing exactly these fields:
- requestManagement: {
    totalRequests: number,
    completedRequests: number, 
    completionRate: number,
    avgResponseTime: number,
    avgCompletionTime: number,
    insights: [array of EXACTLY 2 quick actionable insights about request handling],
    performanceRating: "Excellent|Good|Average|Needs Improvement"
  }
- customerSentiment: {
    available: boolean,
    ${customerSentimentData.available ? `
    overallSentiment: "Positive|Mixed|Negative",
    averageRating: number,
    keyStrengths: [array of 2-3 strengths],
    improvementAreas: [array of 1-2 areas for improvement],
    ` : `message: "${customerSentimentData.message}"`}
  }${orderMetrics ? `
- orderManagement: {
    totalOrders: number,
    ordersProcessed: number,
    orderProcessingRate: number,
    avgProcessingTime: number,
    orderInsights: [array of EXACTLY 2 actionable insights about order handling],
    efficiencyRating: "Excellent|Good|Average|Needs Improvement"
  }` : ''}${sessionActivityMetrics ? `
- sessionManagement: {
    efficiencyRating: "Excellent|Good|Average|Needs Improvement",
    sessionInsights: [array of 2 insights about session handling and transfers],
    workloadBalance: "Well-balanced|Heavy load|Light load",
    transferEffectiveness: "Effective|Moderate|Needs improvement"
  }` : ''}
- overallAnalysis: "2-3 sentences with overall performance summary considering session and order management and actionable advice"
- priorityFocus: "One main area to focus on today for improvement considering session and order data"

IMPORTANT GUIDELINES:
1. For 'insights': Provide EXACTLY 2 bullet points - quick, actionable insights about request handling
2. For 'orderInsights': Provide EXACTLY 2 bullet points - quick, actionable insights about order processing and efficiency
3. For 'overallAnalysis': Address the waiter directly with immediate actions they can take RIGHT NOW during this shift. Do NOT suggest training, system improvements, or anything requiring time. Focus on immediate behavioral changes like "Complete your acknowledged requests faster" or "Check table 5 - they've been waiting 10 minutes"
4. Be direct and specific - speak TO the waiter, not ABOUT the waiter${sessionActivityMetrics ? `
5. For 'sessionInsights': Consider transfer patterns, session duration, and workload distribution for actionable session management advice
6. Factor in session transfers when evaluating performance - transferred sessions should be attributed correctly` : ''}${orderMetrics ? `
7. For order management analysis: Consider order acknowledgment speed, completion time, and status change patterns for actionable advice` : ''}`;

    try {
      const model = new ChatOpenAI({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o'),
        temperature: 0.1,
      });

      const aiResponse = await model.invoke([
        { role: 'user', content: prompt }
      ], {
        response_format: { type: 'json_schema', json_schema: {
          name: 'waiter_performance_analysis',
          schema: {
            type: 'object',
            properties: {
              requestManagement: {
                type: 'object',
                properties: {
                  totalRequests: { type: 'number' },
                  completedRequests: { type: 'number' },
                  completionRate: { type: 'number' },
                  avgResponseTime: { type: 'number' },
                  avgCompletionTime: { type: 'number' },
                  insights: { 
                    type: 'array', 
                    items: { type: 'string' },
                    maxItems: 2
                  },
                  performanceRating: { 
                    type: 'string',
                    enum: ['Excellent', 'Good', 'Average', 'Needs Improvement']
                  }
                },
                required: ['totalRequests', 'completedRequests', 'completionRate', 'avgResponseTime', 'avgCompletionTime', 'insights', 'performanceRating']
              },
              customerSentiment: {
                type: 'object',
                properties: {
                  available: { type: 'boolean' },
                  overallSentiment: { type: 'string' },
                  averageRating: { type: 'number' },
                  keyStrengths: { 
                    type: 'array', 
                    items: { type: 'string' }
                  },
                  improvementAreas: { 
                    type: 'array', 
                    items: { type: 'string' }
                  },
                  message: { type: 'string' }
                },
                required: ['available']
              },
              ...(orderMetrics ? {
                orderManagement: {
                  type: 'object',
                  properties: {
                    totalOrders: { type: 'number' },
                    ordersProcessed: { type: 'number' },
                    orderProcessingRate: { type: 'number' },
                    avgProcessingTime: { type: 'number' },
                    orderInsights: { 
                      type: 'array', 
                      items: { type: 'string' },
                      maxItems: 2
                    },
                    efficiencyRating: { 
                      type: 'string',
                      enum: ['Excellent', 'Good', 'Average', 'Needs Improvement']
                    }
                  },
                  required: ['totalOrders', 'ordersProcessed', 'orderProcessingRate', 'avgProcessingTime', 'orderInsights', 'efficiencyRating']
                }
              } : {}),
              ...(sessionActivityMetrics ? {
                sessionManagement: {
                  type: 'object',
                  properties: {
                    efficiencyRating: { 
                      type: 'string',
                      enum: ['Excellent', 'Good', 'Average', 'Needs Improvement']
                    },
                    sessionInsights: { 
                      type: 'array', 
                      items: { type: 'string' },
                      maxItems: 2
                    },
                    workloadBalance: { 
                      type: 'string',
                      enum: ['Well-balanced', 'Heavy load', 'Light load']
                    },
                    transferEffectiveness: { 
                      type: 'string',
                      enum: ['Effective', 'Moderate', 'Needs improvement']
                    }
                  },
                  required: ['efficiencyRating', 'sessionInsights', 'workloadBalance', 'transferEffectiveness']
                }
              } : {}),
              overallAnalysis: { type: 'string' },
              priorityFocus: { type: 'string' }
            },
            required: (() => {
              const baseRequired = ['requestManagement', 'customerSentiment', 'overallAnalysis', 'priorityFocus'];
              if (orderMetrics) baseRequired.splice(2, 0, 'orderManagement');
              if (sessionActivityMetrics) baseRequired.splice(-2, 0, 'sessionManagement');
              return baseRequired;
            })()
          }
        }}
      });

      this.logger.log('Comprehensive AI Analysis Response:', aiResponse.content);
      
      const parsedResponse = JSON.parse(aiResponse.content as string);
      
      // Add raw metrics for frontend display
      parsedResponse.requestManagement = {
        ...parsedResponse.requestManagement,
        totalRequests: requestMetrics.totalRequests,
        completedRequests: requestMetrics.completedRequests,
        completionRate: requestMetrics.completionRate,
        avgResponseTime: requestMetrics.avgResponseTime,
        avgCompletionTime: requestMetrics.avgCompletionTime
      };

      // Add session metrics if available
      if (sessionActivityMetrics) {
        parsedResponse.sessionActivityMetrics = sessionActivityMetrics;
      }

      // Add order metrics if available
      if (orderMetrics) {
        parsedResponse.orderManagement = {
          ...parsedResponse.orderManagement,
          totalOrders: orderMetrics.totalOrders,
          ordersProcessed: orderMetrics.ordersProcessed,
          orderProcessingRate: orderMetrics.totalOrders > 0 ? ((orderMetrics.ordersProcessed / orderMetrics.totalOrders) * 100) : 0,
          avgProcessingTime: orderMetrics.avgOrderProcessingTime
        };
        parsedResponse.orderMetrics = orderMetrics; // Add raw metrics for frontend
      }

      return parsedResponse;

    } catch (error) {
      this.logger.error(`Error in AI analysis: ${error.message}`);
      
      // Simple error response - no fallback analysis
      throw new Error('AI analysis is temporarily unavailable. Please try again later.');
    }
  }

  /**
   * Get waiter profile information
   * @param waiterId The waiter ID to get profile for
   * @returns Waiter profile with restaurant details
   */
  async getProfile(waiterId: string): Promise<any> {
    try {
      const waiter = await this.prisma.waiter.findUnique({
        where: { id: waiterId },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          accessAccount: {
            select: {
              username: true,
            },
          },
        },
      });

      if (!waiter) {
        throw new NotFoundException('Waiter not found');
      }

      return {
        id: waiter.id,
        name: waiter.name,
        surname: waiter.surname,
        username: waiter.accessAccount?.username || null,
        email: waiter.email,
        phone: waiter.phone,
        address: waiter.address,
        tag_nickname: waiter.tag_nickname,
        restaurant: waiter.restaurant,
        createdAt: waiter.createdAt,
        updatedAt: waiter.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error getting waiter profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get available waiters for session transfer (same restaurant, excluding current waiter)
   * @param currentWaiterId The current waiter ID
   * @returns List of available waiters
   */
  async getAvailableWaiters(currentWaiterId: string): Promise<any[]> {
    try {
      // First get the current waiter's restaurant
      const currentWaiter = await this.prisma.waiter.findUnique({
        where: { id: currentWaiterId },
        select: { restaurantId: true },
      });

      if (!currentWaiter) {
        throw new NotFoundException('Waiter not found');
      }

      // Get all waiters from same restaurant excluding current waiter
      const waiters = await this.prisma.waiter.findMany({
        where: {
          restaurantId: currentWaiter.restaurantId,
          id: { not: currentWaiterId }, // Exclude current waiter
          userType: 'waiter', // Only include waiters with userType 'waiter'
        },
        select: {
          id: true,
          name: true,
          surname: true,
          tag_nickname: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      return waiters;
    } catch (error) {
      this.logger.error(`Error getting available waiters: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Transfer all active sessions from one waiter to another
   * @param fromWaiterId The waiter transferring sessions
   * @param toWaiterId The waiter receiving sessions
   * @returns Transfer result
   */
  async transferSessions(fromWaiterId: string, toWaiterId: string): Promise<any> {
    try {
      // Validate both waiters exist and are from same restaurant
      const [fromWaiter, toWaiter] = await Promise.all([
        this.prisma.waiter.findUnique({
          where: { id: fromWaiterId },
          select: { restaurantId: true, name: true, surname: true, userType: true },
        }),
        this.prisma.waiter.findUnique({
          where: { id: toWaiterId },
          select: { restaurantId: true, name: true, surname: true, userType: true },
        }),
      ]);

      if (!fromWaiter || !toWaiter) {
        throw new NotFoundException('One or both waiters not found');
      }

      if (fromWaiter.userType !== 'waiter' || toWaiter.userType !== 'waiter') {
        throw new BadRequestException('Both users must be waiters');
      }

      if (fromWaiter.restaurantId !== toWaiter.restaurantId) {
        throw new BadRequestException('Waiters must be from the same restaurant');
      }

      // Get all active sessions for the transferring waiter
      const activeSessions = await this.prisma.user.findMany({
        where: {
          waiterId: fromWaiterId,
          sessionId: { not: { startsWith: 'CLOSED_' } }, // Only active sessions
        },
      });

      if (activeSessions.length === 0) {
        return {
          message: 'No active sessions to transfer',
          transferredSessions: 0,
        };
      }

      // Use transaction to ensure data consistency
      const result = await this.prisma.$transaction(async (tx) => {
        // Update all active sessions to point to new waiter
        const updateResult = await tx.user.updateMany({
          where: {
            waiterId: fromWaiterId,
            sessionId: { not: { startsWith: 'CLOSED_' } },
          },
          data: {
            waiterId: toWaiterId,
          },
        });

        // Log transfer activities for each session
        for (const session of activeSessions) {
          // Log transfer from perspective of the transferring waiter
          await this.logSessionActivity(
            session.sessionId,
            'transferred_session_from',
            fromWaiterId,
            'waiter',
            {
              transferredTo: toWaiterId,
              transferredToName: `${toWaiter.name} ${toWaiter.surname}`,
              tableNumber: session.tableNumber,
            }
          );

          // Log transfer from perspective of the receiving waiter
          await this.logSessionActivity(
            session.sessionId,
            'transferred_session_to',
            toWaiterId,
            'waiter',
            {
              transferredFrom: fromWaiterId,
              transferredFromName: `${fromWaiter.name} ${fromWaiter.surname}`,
              tableNumber: session.tableNumber,
            }
          );
        }

        return updateResult.count;
      });

      // Invalidate relevant caches
      await Promise.all([
        this.sessionCache.invalidateActiveSessions(fromWaiterId),
        this.sessionCache.invalidateActiveSessions(toWaiterId),
        this.sessionCache.invalidateAllActiveSessions(),
      ]);

      this.logger.log(
        `Transferred ${result} sessions from waiter ${fromWaiter.name} ${fromWaiter.surname} to ${toWaiter.name} ${toWaiter.surname}`
      );

      return {
        message: `Successfully transferred ${result} sessions to ${toWaiter.name} ${toWaiter.surname}`,
        transferredSessions: result,
      };
    } catch (error) {
      this.logger.error(`Error transferring sessions: ${error.message}`, error.stack);
      throw error;
    }
  }

  async transferSpecificSessions(currentWaiterId: string, sessionIds: string[], targetWaiterId: string) {
    try {
      // Validate target waiter exists and get details
      const [currentWaiter, targetWaiter] = await Promise.all([
        this.prisma.waiter.findUnique({
          where: { id: currentWaiterId },
          select: { restaurantId: true, name: true, surname: true, userType: true },
        }),
        this.prisma.waiter.findUnique({
          where: { id: targetWaiterId },
          select: { restaurantId: true, name: true, surname: true, userType: true },
        }),
      ]);

      if (!currentWaiter || !targetWaiter) {
        throw new NotFoundException('One or both waiters not found');
      }

      if (currentWaiter.userType !== 'waiter' || targetWaiter.userType !== 'waiter') {
        throw new BadRequestException('Both users must be waiters');
      }

      if (currentWaiter.restaurantId !== targetWaiter.restaurantId) {
        throw new BadRequestException('Waiters must be from the same restaurant');
      }

      // Find specific active sessions for current waiter
      const sessions = await this.prisma.user.findMany({
        where: {
          sessionId: { 
            in: sessionIds,
            not: { startsWith: 'CLOSED_' } // Only active sessions
          },
          waiterId: currentWaiterId,
        },
      });

      if (sessions.length === 0) {
        throw new BadRequestException('No active sessions found to transfer');
      }

      if (sessions.length !== sessionIds.length) {
        throw new BadRequestException('Some sessions not found or not owned by current waiter');
      }

      // Use transaction to transfer specific sessions
      const result = await this.prisma.$transaction(async (tx) => {
        // Update specific sessions to point to new waiter
        const updateResult = await tx.user.updateMany({
          where: {
            sessionId: { 
              in: sessionIds,
              not: { startsWith: 'CLOSED_' } 
            },
            waiterId: currentWaiterId,
          },
          data: {
            waiterId: targetWaiterId,
          },
        });

        // Log transfer activities for each specific session
        for (const session of sessions) {
          // Log transfer from perspective of the transferring waiter
          await this.logSessionActivity(
            session.sessionId,
            'transferred_session_from',
            currentWaiterId,
            'waiter',
            {
              transferredTo: targetWaiterId,
              transferredToName: `${targetWaiter.name} ${targetWaiter.surname}`,
              tableNumber: session.tableNumber,
              transferType: 'specific',
            }
          );

          // Log transfer from perspective of the receiving waiter
          await this.logSessionActivity(
            session.sessionId,
            'transferred_session_to',
            targetWaiterId,
            'waiter',
            {
              transferredFrom: currentWaiterId,
              transferredFromName: `${currentWaiter.name} ${currentWaiter.surname}`,
              tableNumber: session.tableNumber,
              transferType: 'specific',
            }
          );
        }

        return updateResult.count;
      });

      // Invalidate relevant caches
      await Promise.all([
        this.sessionCache.invalidateActiveSessions(currentWaiterId),
        this.sessionCache.invalidateActiveSessions(targetWaiterId),
        this.sessionCache.invalidateAllActiveSessions(),
      ]);

      this.logger.log(
        `Transferred ${result} specific sessions from waiter ${currentWaiter.name} ${currentWaiter.surname} to ${targetWaiter.name} ${targetWaiter.surname}`
      );

      return {
        message: `Successfully transferred ${result} specific sessions to ${targetWaiter.name} ${targetWaiter.surname}`,
        transferredSessions: result,
      };

    } catch (error) {
      this.logger.error('Transfer specific sessions error:', error.message, error.stack);
      throw error;
    }
  }
}
