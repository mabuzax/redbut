import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CacheService } from '../common/cache.service';
import { Prisma, Waiter, OrderStatus, RequestStatus as PrismaRequestStatus, Order, OrderItem, MenuItem, Request as PrismaRequestType, RequestLog, ServiceAnalysis } from '@prisma/client';
import {
  SalesAnalyticsData,
  PopularItemsAnalyticsData,
  HourlySalesAnalyticsData,
  StaffAnalyticsData,
  TablesAnalyticsData,
  RequestsAnalyticsData,
  CustomerRatingsAnalyticsData,
  DateRange,
  SalesSummaryMetrics,
  SalesTrendDataPoint,
  PopularItem,
  RevenueByItemDataPoint,
  HourlySalesDataPoint,
  HourlyAverageOrderValueDataPoint,
  StaffSalesPerformance,
  StaffOrderCount,
  StaffPerformanceDetail,
  TableUtilizationDataPoint,
  // RevenueByTableDataPoint, // This was same as RevenueByItemDataPoint, using that
  WaiterAverageRating,
  RatingDistributionDataPoint,
  RatingsOverTimeDataPoint,
  RecentComment,
  ServiceAnalysisBreakdown,
  ServiceAnalysisData,
  RequestsSummaryMetrics,
  RequestStatusDistribution,
  RequestsOverTimeDataPoint,
  WaiterResponseTimeDataPoint,
  OverallRestaurantRating,
  CustomerSatisfactionTrendDataPoint,
  FeedbackTheme,
  SentimentAnalysisResult,
  StaffPerformanceAnalytics,
  WaiterPerformanceMetrics,
  StaffPerformanceOverview,
  TeamProductivityTrend,
  ServiceQualityMetric,
  WorkloadDistribution,
} from './admin-analytics.types';
import { subDays, startOfMonth, endOfMonth, startOfDay, endOfDay, eachDayOfInterval, format, getHours } from 'date-fns';
import { DateUtil } from '../common/utils/date.util';

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService
  ) {
    // Run cache cleanup every 10 minutes
    setInterval(() => {
      this.cacheService.cleanup();
    }, 10 * 60 * 1000);
  }

  private getDefaultDateRange(days = 7): DateRange {
    return DateUtil.getDefaultDateRange(days);
  }

  private getCurrentMonthDateRange(): DateRange {
    return DateUtil.getCurrentMonthDateRange();
  }

  private getTodayDateRange(): DateRange {
    return DateUtil.getTodayDateRange();
  }

  /**
   * Convert start date string to proper Date object (start of day)
   */
  private getStartDate(dateString: string): Date {
    return DateUtil.startOfDayUTC(new Date(dateString));
  }

  /**
   * Convert end date string to proper Date object (end of day to include full day until midnight)
   */
  private getEndDate(dateString: string): Date {
    return DateUtil.endOfDayUTC(new Date(dateString));
  }

  async getSalesAnalytics(dateRange?: DateRange): Promise<SalesAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(30);
    this.logger.log(`Fetching sales analytics from ${startDate} to ${endDate}`);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) } },
      include: { orderItems: true },
      orderBy: { createdAt: 'asc' },
    });

    let totalSales = 0;
    orders.forEach(order => {
      order.orderItems.forEach(item => {
        totalSales += item.price.toNumber() * item.quantity;
      });
    });

    const summary: SalesSummaryMetrics = {
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalOrders: orders.length,
      averageOrderValue: orders.length > 0 ? parseFloat((totalSales / orders.length).toFixed(2)) : 0,
    };

    const salesTrendMap = new Map<string, { sales: number; orders: number }>();
    orders.forEach(order => {
      const day = format(order.createdAt, 'yyyy-MM-dd');
      const currentDayData = salesTrendMap.get(day) || { sales: 0, orders: 0 };
      let orderSales = 0;
      order.orderItems.forEach(item => {
        orderSales += item.price.toNumber() * item.quantity;
      });
      currentDayData.sales += orderSales;
      currentDayData.orders += 1;
      salesTrendMap.set(day, currentDayData);
    });

    const salesTrend: SalesTrendDataPoint[] = Array.from(salesTrendMap.entries()).map(([date, data]) => ({
      date,
      sales: parseFloat(data.sales.toFixed(2)),
      orders: data.orders,
    }));
    
    return { summary, salesTrend };
  }

  async getPopularItemsAnalytics(dateRange?: DateRange): Promise<PopularItemsAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(30);
    this.logger.log(`Fetching popular items analytics from ${startDate} to ${endDate}`);

    const orderItems = await this.prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) } } },
      include: { menuItem: { select: { id: true, name: true } } },
    });

    const itemStats = new Map<string, { menuItemId: string, itemName: string; quantitySold: number; totalRevenue: number }>();
    let totalRevenueAllItems = 0;

    orderItems.forEach(orderItem => {
      const itemName = orderItem.menuItem.name;
      const current = itemStats.get(itemName) || { menuItemId: orderItem.menuItemId, itemName, quantitySold: 0, totalRevenue: 0 };
      current.quantitySold += orderItem.quantity;
      const itemRevenue = orderItem.price.toNumber() * orderItem.quantity;
      current.totalRevenue += itemRevenue;
      itemStats.set(itemName, current);
      totalRevenueAllItems += itemRevenue;
    });

    const popularItems: PopularItem[] = Array.from(itemStats.values())
      .map(stats => ({
        ...stats,
        itemId: stats.menuItemId,
        percentageOfTotalRevenue: totalRevenueAllItems > 0 ? parseFloat(((stats.totalRevenue / totalRevenueAllItems) * 100).toFixed(2)) : 0,
        totalRevenue: parseFloat(stats.totalRevenue.toFixed(2)),
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10); 

    const revenueByItem: RevenueByItemDataPoint[] = popularItems.map(item => ({
        name: item.itemName,
        value: item.totalRevenue,
    })).sort((a,b) => b.value - a.value);

    return { topSellingItems: popularItems, revenueByItem };
  }

  async getHourlySalesAnalytics(dateRange?: DateRange): Promise<HourlySalesAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getTodayDateRange(); 
    this.logger.log(`Fetching hourly sales analytics from ${startDate} to ${endDate}`);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) } },
      include: { orderItems: true },
    });

    const hourlyDataMap = new Map<string, { sales: number; orders: number }>();
    for (let i = 0; i < 24; i++) {
        hourlyDataMap.set(String(i).padStart(2, '0') + ":00", { sales: 0, orders: 0 });
    }
        
    orders.forEach(order => {
      const hourKey = format(order.createdAt, 'HH') + ":00";
      const current = hourlyDataMap.get(hourKey) || { sales: 0, orders: 0 }; 
      let orderSales = 0;
      order.orderItems.forEach(item => {
        orderSales += item.price.toNumber() * item.quantity;
      });
      current.sales += orderSales;
      current.orders += 1;
      hourlyDataMap.set(hourKey, current);
    });
    
    const salesTodayByHour: HourlySalesDataPoint[] = Array.from(hourlyDataMap.entries())
        .map(([hour, data]) => ({ hour, sales: parseFloat(data.sales.toFixed(2)), orders: data.orders }))
        .sort((a,b) => a.hour.localeCompare(b.hour));

    const averageOrderValueByHour: HourlyAverageOrderValueDataPoint[] = salesTodayByHour.map(data => ({
      hour: data.hour,
      averageOrderValue: data.orders > 0 ? parseFloat((data.sales / data.orders).toFixed(2)) : 0,
    }));

    return { salesTodayByHour, averageOrderValueByHour };
  }

  async getStaffAnalytics(dateRange?: DateRange, tenantId?: string): Promise<StaffAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(30);
    this.logger.log(`Fetching staff analytics from ${startDate} to ${endDate} for tenant: ${tenantId || 'all'}`);
    
    // Base filter for waiters - include tenant filtering if tenantId provided
    const waiterFilter: any = {};
    if (tenantId) {
      // First get all restaurants for this tenant
      const tenantRestaurants = await this.prisma.restaurant.findMany({
        where: { tenantId },
        select: { id: true }
      });
      const restaurantIds = tenantRestaurants.map(r => r.id);
      
      // Filter waiters to only those belonging to tenant's restaurants
      waiterFilter.restaurantId = { in: restaurantIds };
    }
    
    const waiters = await this.prisma.waiter.findMany({ 
        where: waiterFilter,
        include: { 
            accessAccount: { select: { userType: true }}, 
            serviceAnalysis: { where: { createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) } } },
        }
    });

    const salesPerformance: StaffSalesPerformance[] = [];
    const orderCounts: StaffOrderCount[] = [];
    const performanceDetails: StaffPerformanceDetail[] = [];
    
    for (const waiter of waiters) {
        const staffName = `${waiter.name} ${waiter.surname} (${waiter.tag_nickname})`;
        let totalSales = 0;
        let totalOrders = 0;
        let itemsSoldCount = 0; 
        let requestsHandled = 0;
        
        // Use session-aware approach: Get all sessions where this waiter had activity within the date range
        const waiterSessionActivity = await this.prisma.userSessionLog.findMany({
            where: {
                actorId: waiter.id,
                actorType: 'waiter',
                dateTime: {
                    gte: this.getStartDate(startDate),
                    lte: this.getEndDate(endDate),
                }
            },
            select: { sessionId: true },
            distinct: ['sessionId']
        });

        const sessionIdsFromActivity = waiterSessionActivity.map(activity => activity.sessionId);
        
        // Also get current active sessions for this waiter
        const waiterSessions = await this.prisma.user.findMany({
            where: { 
                waiterId: waiter.id,
                sessionId: { not: { startsWith: 'CLOSED_' } } // Exclude closed sessions
            },
            select: { sessionId: true },
        });
        const currentSessionIds = waiterSessions.map(session => session.sessionId);

        // Combine session IDs from both sources
        const allRelevantSessionIds = [...new Set([...sessionIdsFromActivity, ...currentSessionIds])];
        
        if (allRelevantSessionIds.length > 0) {
            // Get all requests from these sessions
            const allRequests = await this.prisma.request.findMany({
                where: {
                    sessionId: { in: allRelevantSessionIds }
                },
                orderBy: { createdAt: 'asc' }
            });

            // Get all orders from these sessions
            const allOrders = await this.prisma.order.findMany({
                where: {
                    sessionId: { in: allRelevantSessionIds }
                },
                include: { orderItems: true },
                orderBy: { createdAt: 'asc' }
            });

            // Now filter requests and orders based on session timeline responsibility
            const sessionTimelines = await Promise.all(
                allRelevantSessionIds.map(sessionId => this.reconstructSessionTimeline(sessionId, this.getStartDate(startDate), this.getEndDate(endDate)))
            );

            // Count requests that occurred during waiter's responsibility period
            for (const request of allRequests) {
                if (this.isWaiterResponsibleAtTime(waiter.id, request.sessionId, request.createdAt, sessionTimelines)) {
                    requestsHandled++;
                }
            }

            // Count orders and calculate sales that occurred during waiter's responsibility period
            for (const order of allOrders) {
                if (this.isWaiterResponsibleAtTime(waiter.id, order.sessionId, order.createdAt, sessionTimelines)) {
                    let orderValue = 0;
                    let orderItemCount = 0;
                    order.orderItems.forEach(item => {
                        orderValue += item.price.toNumber() * item.quantity;
                        orderItemCount += item.quantity;
                    });
                    totalSales += orderValue;
                    itemsSoldCount += orderItemCount;
                    totalOrders += 1;
                }
            }
        }

        salesPerformance.push({
            staffId: waiter.id,
            staffName,
            totalSales: parseFloat(totalSales.toFixed(2)),
            totalOrders,
            averageOrderValue: totalOrders > 0 ? parseFloat((totalSales / totalOrders).toFixed(2)) : 0,
            itemsSold: itemsSoldCount
        });
        orderCounts.push({ name: staffName, value: totalOrders });
        
        const avgRating = waiter.serviceAnalysis.length > 0 
            ? waiter.serviceAnalysis.reduce((sum: number, analysis: any) => sum + analysis.rating, 0) / waiter.serviceAnalysis.length
            : 0;

        performanceDetails.push({
            staffId: waiter.id,
            staffName,
            position: waiter.accessAccount?.userType.toString() || 'Waiter',
            shiftsWorked: 0, // We're no longer tracking shifts
            totalHoursWorked: 0, // We're no longer tracking hours worked
            averageRating: parseFloat(avgRating.toFixed(1)),
            requestsHandled,
            ordersHandled: totalOrders,
        });
    }

    return { 
        salesPerformance: salesPerformance.sort((a,b) => b.totalSales - a.totalSales), 
        orderCounts: orderCounts.sort((a,b) => b.value - a.value), 
        performanceDetails 
    };
  }

  async getStaffDetailedAnalytics(staffId: string, dateRange?: DateRange): Promise<any> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(30);
    this.logger.log(`Fetching detailed analytics for staff ${staffId} from ${startDate} to ${endDate}`);
    
    // Get waiter details
    const waiter = await this.prisma.waiter.findUnique({
      where: { id: staffId },
      include: { 
        accessAccount: { select: { userType: true }},
        serviceAnalysis: { where: { createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) } } },
      }
    });

    if (!waiter) {
      throw new Error(`Staff member with ID ${staffId} not found`);
    }

    // Get all user sessions for this waiter
    const waiterSessions = await this.prisma.user.findMany({
      where: { 
        waiterId: waiter.id,
        createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) }
      },
      select: { sessionId: true, createdAt: true }
    });

    const sessionIds = waiterSessions.map(session => session.sessionId);

    // Get requests performance data
    const requests = await this.prisma.request.findMany({
      where: { 
        sessionId: { in: sessionIds },
        createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) }
      },
      select: { 
        id: true, 
        status: true, 
        createdAt: true, 
        updatedAt: true,
        sessionId: true
      }
    });

    // Get service analysis for requests
    const requestAnalysis = await this.prisma.serviceAnalysis.findMany({
      where: {
        waiterId: waiter.id,
        serviceType: 'request',
        createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) }
      },
      select: { rating: true, createdAt: true }
    });

    // Get orders performance data
    const orders = await this.prisma.order.findMany({
      where: { 
        sessionId: { in: sessionIds },
        createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) }
      },
      select: { 
        id: true, 
        status: true, 
        createdAt: true, 
        updatedAt: true,
        sessionId: true
      }
    });

    // Get service analysis for orders
    const orderAnalysis = await this.prisma.serviceAnalysis.findMany({
      where: {
        waiterId: waiter.id,
        serviceType: 'order',
        createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) }
      },
      select: { rating: true, createdAt: true }
    });

    // Calculate requests performance metrics
    const requestsCount = requests.length;
    let totalResolveTime = 0;
    let resolvedRequestsCount = 0;
    
    requests.forEach(request => {
      if (request.status === 'Done' && request.updatedAt) {
        const resolveTime = request.updatedAt.getTime() - request.createdAt.getTime();
        totalResolveTime += resolveTime;
        resolvedRequestsCount++;
      }
    });

    const avgResolveTimeMs = resolvedRequestsCount > 0 ? totalResolveTime / resolvedRequestsCount : 0;
    const avgResolveTimeMinutes = Math.round(avgResolveTimeMs / (1000 * 60));

    // Calculate request ratings
    const requestRatings = requestAnalysis.map(r => r.rating);
    const avgRequestRating = requestRatings.length > 0 ? 
      requestRatings.reduce((sum, rating) => sum + rating, 0) / requestRatings.length : 0;
    const highestRequestRating = requestRatings.length > 0 ? Math.max(...requestRatings) : 0;
    const lowestRequestRating = requestRatings.length > 0 ? Math.min(...requestRatings) : 0;

    // Calculate order ratings
    const orderRatings = orderAnalysis.map(r => r.rating);
    const avgOrderRating = orderRatings.length > 0 ? 
      orderRatings.reduce((sum, rating) => sum + rating, 0) / orderRatings.length : 0;
    const highestOrderRating = orderRatings.length > 0 ? Math.max(...orderRatings) : 0;
    const lowestOrderRating = orderRatings.length > 0 ? Math.min(...orderRatings) : 0;

    // Get all service analysis data for AI review
    const allServiceAnalysis = await this.prisma.serviceAnalysis.findMany({
      where: {
        waiterId: waiter.id,
        createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) }
      },
      select: { 
        serviceType: true, 
        rating: true, 
        analysis: true, 
        createdAt: true 
      }
    });

    return {
      profile: {
        id: waiter.id,
        name: waiter.name,
        surname: waiter.surname,
        tag: waiter.tag_nickname,
        email: waiter.email || 'Not available',
        phone: waiter.phone || 'Not available',
        address: waiter.address || 'Not available',
        joined: waiter.createdAt,
        position: waiter.accessAccount?.userType?.toString() || 'Waiter',
        profileImage: waiter.propic || null
      },
      requestsPerformance: {
        totalRequests: requestsCount,
        avgResolveTimeMinutes,
        avgRating: parseFloat(avgRequestRating.toFixed(1)),
        highestRating: highestRequestRating,
        lowestRating: lowestRequestRating
      },
      ordersPerformance: {
        totalOrders: orders.length,
        avgRating: parseFloat(avgOrderRating.toFixed(1)),
        highestRating: highestOrderRating,
        lowestRating: lowestOrderRating
      },
      serviceAnalysisData: allServiceAnalysis
    };
  }

  async getStaffAIPerformanceReview(staffId: string, dateRange?: DateRange): Promise<any> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(30);
    this.logger.log(`Fetching AI performance review for staff ${staffId} from ${startDate} to ${endDate}`);
    
    // Get service analysis data for this waiter in the date range
    const serviceAnalysisData = await this.prisma.serviceAnalysis.findMany({
      where: {
        waiterId: staffId,
        createdAt: {
          gte: this.getStartDate(startDate),
          lte: this.getEndDate(endDate),
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

    this.logger.log(`Found ${serviceAnalysisData.length} service analysis records for staff ${staffId} in date range`);

    if (serviceAnalysisData.length === 0) {
      return {
        customerSentiment: 'No Data Available',
        happinessBreakdown: {},
        improvementPoints: ['No customer feedback received in the selected period'],
        overallAnalysis: 'No customer feedback has been received in the selected period. Focus on engaging with customers and encouraging them to provide feedback on their experience.',
        totalFeedback: 0,
        dateRange: `${startDate} to ${endDate}`
      };
    }

    // Prepare data for AI analysis
    const analysisContent = serviceAnalysisData.map((item: any, index: number) => {
      const analysis = item.analysis as any;
      const rating = item.rating || 3;
      const comment = analysis.comment || 'No comment provided';
      
      // Calculate average rating from individual metrics if available
      const avgRating = analysis.friendliness && analysis.orderAccuracy && analysis.speed && analysis.attentiveness && analysis.knowledge
        ? Math.round((analysis.friendliness + analysis.orderAccuracy + analysis.speed + analysis.attentiveness + analysis.knowledge) / 5)
        : rating;
        
      return `Review ${index + 1} (Table ${item.user?.tableNumber || 'Unknown'}, Type: ${item.serviceType || 'unknown'}):
- Overall Rating: ${avgRating}
- Individual Ratings: Friendliness: ${analysis.friendliness}, Order Accuracy: ${analysis.orderAccuracy}, Speed: ${analysis.speed}, Attentiveness: ${analysis.attentiveness}, Knowledge: ${analysis.knowledge}
- Customer Comment: "${comment}"
- Service Type: ${item.serviceType || 'request'}
---`;
    }).join('\n');

    // Create AI prompt with JSON schema for structured output
    const prompt = `You are an AI assistant analyzing a waiter's performance based on customer feedback from ${startDate} to ${endDate}. Please analyze the following service analysis data and provide a structured JSON response.

Customer Feedback Data:
${analysisContent}

Please respond with a JSON object containing exactly these fields:
- overall_sentiment: Overall sentiment assessment (e.g., "Excellent", "Good", "Satisfactory", "Needs Improvement")
- happiness_breakdown: Object with happiness levels as keys and percentage/count summaries as values
- improvement_points: Array of 3-5 specific improvement recommendations based on customer feedback
- strengths: Array of 2-3 positive aspects mentioned by customers
- overall_analysis: 2-3 sentence summary of performance including trends and key insights
- recommendation: One actionable recommendation for the manager

Analyze patterns in the feedback and provide insights that would be valuable for both the waiter and their manager.`;

    try {
      // Use structured output with JSON schema
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Today's date is: ${new Date().toISOString().split('T')[0]}. You are an expert restaurant manager analyzing waiter performance based on customer feedback data.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "waiter_performance_analysis",
              strict: false,
              schema: {
                type: "object",
                properties: {
                  overall_sentiment: {
                    type: "string",
                    description: "Overall sentiment assessment"
                  },
                  happiness_breakdown: {
                    type: "object",
                    description: "Analysis breakdown by sentiment/theme",
                    additionalProperties: {
                      type: "number"
                    }
                  },
                  improvement_points: {
                    type: "array",
                    items: {
                      type: "string"
                    },
                    description: "Specific improvement recommendations"
                  },
                  strengths: {
                    type: "array",
                    items: {
                      type: "string"
                    },
                    description: "Positive aspects mentioned by customers"
                  },
                  overall_analysis: {
                    type: "string",
                    description: "Performance summary with trends and insights"
                  },
                  recommendation: {
                    type: "string",
                    description: "One actionable recommendation for the manager"
                  }
                },
                required: ["overall_sentiment", "happiness_breakdown", "improvement_points", "strengths", "overall_analysis", "recommendation"],
                additionalProperties: false
              }
            }
          },
          max_tokens: 1000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const aiData = await response.json();
      const aiAnalysis = JSON.parse(aiData.choices[0].message.content);

      return {
        ...aiAnalysis,
        totalFeedback: serviceAnalysisData.length,
        dateRange: `${startDate} to ${endDate}`,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to get AI analysis:', error);
      
      // Fallback to basic analysis if AI fails
      const ratingCounts = serviceAnalysisData.reduce((acc: any, item: any) => {
        const rating = item.rating || 3;
        const range = rating >= 4 ? 'High (4-5)' : rating >= 3 ? 'Medium (3)' : 'Low (1-2)';
        acc[range] = (acc[range] || 0) + 1;
        return acc;
      }, {});

      const avgRating = serviceAnalysisData.reduce((sum, item: any) => sum + (item.rating || 3), 0) / serviceAnalysisData.length;

      return {
        overall_sentiment: avgRating >= 4 ? 'Good' : avgRating >= 3 ? 'Satisfactory' : 'Needs Improvement',
        happiness_breakdown: ratingCounts,
        improvement_points: ['AI analysis temporarily unavailable', 'Please review individual feedback for insights'],
        strengths: ['Manual review recommended'],
        overall_analysis: `Based on ${serviceAnalysisData.length} feedback entries with an average rating of ${avgRating.toFixed(1)}. AI analysis is temporarily unavailable.`,
        recommendation: 'Review individual customer feedback for detailed insights.',
        totalFeedback: serviceAnalysisData.length,
        dateRange: `${startDate} to ${endDate}`,
        lastUpdated: new Date().toISOString(),
        error: 'AI analysis unavailable'
      };
    }
  }

  async getTablesAnalytics(dateRange?: DateRange): Promise<TablesAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(7);
    this.logger.log(`Fetching tables analytics from ${startDate} to ${endDate}`);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) } },
      include: { orderItems: true }
    });

    const tableStatsMap = new Map<number, { totalOrders: number; totalRevenue: number }>();

    orders.forEach(order => {
      const current = tableStatsMap.get(order.tableNumber) || { totalOrders: 0, totalRevenue: 0 };
      current.totalOrders += 1;
      let orderRevenue = 0;
      order.orderItems.forEach(item => {
        orderRevenue += item.price.toNumber() * item.quantity;
      });
      current.totalRevenue += orderRevenue;
      tableStatsMap.set(order.tableNumber, current);
    });

    const utilization: TableUtilizationDataPoint[] = Array.from(tableStatsMap.entries())
      .map(([tableNumber, stats]) => ({ 
          tableNumber, 
          totalOrders: stats.totalOrders,
          totalRevenue: parseFloat(stats.totalRevenue.toFixed(2)) 
        }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const revenueByTable: RevenueByItemDataPoint[] = utilization.map(t => ({
        name: `Table ${t.tableNumber}`,
        value: t.totalRevenue
    }));

    return { utilization, revenueByTable };
  }

  async getServiceAnalyticsFromServiceAnalysis(dateRange?: DateRange, tenantId?: string): Promise<ServiceAnalysisData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(30);
    this.logger.log(`Fetching waiter ratings analytics from service analysis from ${startDate} to ${endDate} for tenant: ${tenantId || 'all'}`);

    try {
      // Base filter for waiters - include tenant filtering if tenantId provided
      const waiterFilter: any = {};
      if (tenantId) {
        // First get all restaurants for this tenant
        const tenantRestaurants = await this.prisma.restaurant.findMany({
          where: { tenantId },
          select: { id: true }
        });
        const restaurantIds = tenantRestaurants.map(r => r.id);
        
        // Filter waiters to only those belonging to tenant's restaurants
        waiterFilter.restaurantId = { in: restaurantIds };
      }

      // Get all waiters filtered by tenant
      const waiters = await this.prisma.waiter.findMany({
        where: waiterFilter,
        select: {
          id: true,
          name: true,
          surname: true,
          tag_nickname: true,
        }
      });

      const waiterIds = waiters.map(w => w.id);

      // Get all service analysis data for the period using session-aware approach
      // First, get all service analyses in the date range
      const allServiceAnalyses = await this.prisma.serviceAnalysis.findMany({
        where: {
          createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) }
        },
        include: {
          waiter: {
            select: {
              id: true,
              name: true,
              surname: true,
              tag_nickname: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Filter service analyses based on session responsibility using timeline reconstruction
      const serviceAnalyses: any[] = [];
      
      // Group service analyses by session for efficient timeline reconstruction
      const serviceAnalysesBySession = new Map<string, any[]>();
      allServiceAnalyses.forEach(sa => {
        if (sa.sessionId) {
          if (!serviceAnalysesBySession.has(sa.sessionId)) {
            serviceAnalysesBySession.set(sa.sessionId, []);
          }
          serviceAnalysesBySession.get(sa.sessionId)!.push(sa);
        }
      });

      // Process each session's service analyses
      for (const [sessionId, sessionServiceAnalyses] of serviceAnalysesBySession) {
        // Reconstruct timeline for this session
        const sessionTimeline = await this.reconstructSessionTimeline(sessionId, this.getStartDate(startDate), this.getEndDate(endDate));
        
        // Check each service analysis against session responsibility
        for (const sa of sessionServiceAnalyses) {
          // Find which waiter was responsible at the time of service analysis
          const responsibleWaiterId = this.findResponsibleWaiterAtTime(sessionId, sa.createdAt, [sessionTimeline]);
          
          // Only include if the responsible waiter is in our tenant's waiters
          if (responsibleWaiterId && waiterIds.includes(responsibleWaiterId)) {
            // Update the waiter info to reflect the responsible waiter, not the stored waiterId
            const responsibleWaiter = waiters.find(w => w.id === responsibleWaiterId);
            if (responsibleWaiter) {
              serviceAnalyses.push({
                ...sa,
                waiterId: responsibleWaiterId,
                waiter: {
                  id: responsibleWaiter.id,
                  name: responsibleWaiter.name,
                  surname: responsibleWaiter.surname,
                  tag_nickname: responsibleWaiter.tag_nickname
                }
              });
            }
          }
        }
      }

      // Calculate average ratings per waiter using service analysis ratings
      const averageRatingsPerWaiter: WaiterAverageRating[] = waiters.map(waiter => {
        const waiterAnalyses = serviceAnalyses.filter(sa => sa.waiterId === waiter.id);
        const avgRating = waiterAnalyses.length > 0 
          ? waiterAnalyses.reduce((sum, sa) => sum + sa.rating, 0) / waiterAnalyses.length
          : 0;
        
        return {
          name: `${waiter.name} ${waiter.surname} (${waiter.tag_nickname})`,
          value: parseFloat(avgRating.toFixed(1)),
          waiterId: waiter.id,
          totalRatings: waiterAnalyses.length
        };
      }).sort((a, b) => b.value - a.value);

      // Overall rating distribution (1-5 stars) across ALL service analyses
      const ratingCounts = [0, 0, 0, 0, 0]; // for 1 to 5 stars
      serviceAnalyses.forEach(sa => {
        if (sa.rating >= 1 && sa.rating <= 5) {
          ratingCounts[sa.rating - 1]++;
        }
      });
      const overallRatingDistribution: RatingDistributionDataPoint[] = ratingCounts.map((count, i) => ({
        name: `${i + 1} Star${i === 0 ? '' : 's'}`,
        value: count
      }));

      // Ratings trend over time using service analysis data
      const ratingsTrendMap = new Map<string, { sum: number; count: number }>();
      serviceAnalyses.forEach(sa => {
        const day = format(sa.createdAt, 'yyyy-MM-dd');
        const current = ratingsTrendMap.get(day) || { sum: 0, count: 0 };
        current.sum += sa.rating;
        current.count += 1;
        ratingsTrendMap.set(day, current);
      });
      const ratingsTrend: RatingsOverTimeDataPoint[] = Array.from(ratingsTrendMap.entries()).map(([date, data]) => ({
        date,
        averageRating: data.count > 0 ? parseFloat((data.sum / data.count).toFixed(1)) : 0
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Recent comments from service analysis
      const recentComments: RecentComment[] = serviceAnalyses
        .filter(sa => sa.analysis && typeof sa.analysis === 'object')
        .slice(0, 10)
        .map(sa => {
          const analysis = sa.analysis as any;
          return {
            commentId: `sa_${sa.id}`,
            waiterId: sa.waiterId,
            waiterName: `${sa.waiter.name} ${sa.waiter.surname}`,
            rating: sa.rating,
            commentText: analysis?.reason || 'No reason provided',
            commentDate: sa.createdAt.toISOString(),
          };
        });

      // Ratings breakdown per waiter - since service analysis only has single rating, 
      // we'll use that rating for all categories as a simplified breakdown
      const ratingsBreakdownPerWaiter: ServiceAnalysisBreakdown[] = waiters.map(waiter => {
        const waiterAnalyses = serviceAnalyses.filter(sa => sa.waiterId === waiter.id);
        const avgRating = waiterAnalyses.length > 0 
          ? waiterAnalyses.reduce((sum, sa) => sum + sa.rating, 0) / waiterAnalyses.length
          : 0;
        
        // Calculate service type breakdowns
        const requestAnalyses = waiterAnalyses.filter(sa => sa.serviceType === 'request');
        const orderAnalyses = waiterAnalyses.filter(sa => sa.serviceType === 'order');
        
        const requestAvg = requestAnalyses.length > 0 
          ? requestAnalyses.reduce((sum, sa) => sum + sa.rating, 0) / requestAnalyses.length
          : 0;
        const orderAvg = orderAnalyses.length > 0 
          ? orderAnalyses.reduce((sum, sa) => sum + sa.rating, 0) / orderAnalyses.length
          : 0;
        
        return {
          waiterId: waiter.id,
          waiterName: `${waiter.name} ${waiter.surname} (${waiter.tag_nickname})`,
          averageRating: parseFloat(avgRating.toFixed(1)),
          totalAnalyses: waiterAnalyses.length,
          serviceTypes: {
            request: { count: requestAnalyses.length, averageRating: parseFloat(requestAvg.toFixed(1)) },
            order: { count: orderAnalyses.length, averageRating: parseFloat(orderAvg.toFixed(1)) }
          }
        };
      });

      return {
        averageRatingsPerWaiter,
        overallRatingDistribution,
        ratingsTrend,
        recentComments,
        analysisBreakdownPerWaiter: ratingsBreakdownPerWaiter
      };

    } catch (error) {
      this.logger.error('Failed to fetch waiter ratings analytics from service analysis:', error);
      throw new Error('Failed to load waiter ratings analytics');
    }
  }

  async getRequestsAnalytics(dateRange?: DateRange, tenantId?: string): Promise<RequestsAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(7);
    
    // Fix date range to include full end day
    const adjustedEndDate = this.getEndDate(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999); // Set to end of day
    const adjustedEndDateStr = adjustedEndDate.toISOString().split('T')[0];
    
    this.logger.log(`Fetching requests analytics from ${startDate} to ${endDate} (adjusted to ${adjustedEndDateStr}) for tenant: ${tenantId || 'all'}`);

    // Base filter for requests - include tenant filtering if tenantId provided
    const requestFilter: any = {
      createdAt: { gte: this.getStartDate(startDate), lte: adjustedEndDate }
    };
    
    if (tenantId) {
      // Step 1: Get all restaurants for this tenant
      const tenantRestaurants = await this.prisma.restaurant.findMany({
        where: { tenantId },
        select: { id: true }
      });
      const restaurantIds = tenantRestaurants.map(r => r.id);
      this.logger.log(`Found ${tenantRestaurants.length} restaurants for tenant ${tenantId}: ${restaurantIds}`);
      
      // Step 2: Get all waiters belonging to tenant's restaurants
      const tenantWaiters = await this.prisma.waiter.findMany({
        where: { restaurantId: { in: restaurantIds } },
        select: { id: true }
      });
      const waiterIds = tenantWaiters.map(w => w.id);
      this.logger.log(`Found ${tenantWaiters.length} waiters for tenant restaurants: ${waiterIds}`);

      // Step 3: Get all sessions from users table where restaurant_id matches tenant restaurants
      // This matches your working SQL query approach
      // Debug: Let's check what fields are available in the users table first
      const sampleUser = await this.prisma.user.findFirst({
        select: { 
          sessionId: true, 
          waiterId: true, 
          restaurantId: true,
          // Add other potential field names to check what's available
        }
      });
      this.logger.log(`Sample user record fields: ${JSON.stringify(sampleUser)}`);
      
      const userSessions = await this.prisma.user.findMany({
        where: { 
          restaurantId: { in: restaurantIds }  // Filter by restaurant_id, not waiterId
        },
        select: { sessionId: true, waiterId: true, restaurantId: true },
        distinct: ['sessionId']
      });
      this.logger.log(`Found ${userSessions.length} sessions for tenant restaurants (using restaurant_id): ${userSessions.map(s => s.sessionId).slice(0, 5)}${userSessions.length > 5 ? '...' : ''}`);
      this.logger.log(`Session details: ${JSON.stringify(userSessions.slice(0, 3))}`);
      
      const sessionIds = userSessions.map(session => session.sessionId);

      // Debug: Let's also run a raw SQL query to match your working query exactly
      const rawSqlResult = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM requests 
        WHERE session_id IN (
          SELECT session_id FROM users 
          WHERE restaurant_id IN (
            SELECT id FROM restaurants 
            WHERE tenant_id = ${tenantId}
          )
        ) 
        AND created_at >= ${this.getStartDate(startDate)} 
        AND created_at <= ${adjustedEndDate}
      ` as any[];
      const count = rawSqlResult[0]?.count ? Number(rawSqlResult[0].count) : 0;
      this.logger.log(`Raw SQL query result: ${count} requests found`);

      // Debug: Let's also check what restaurant_id the sessions with requests belong to
      const sessionsWithRequestsDetails = await this.prisma.$queryRaw`
        SELECT DISTINCT u.session_id, u.restaurant_id, r.tenant_id 
        FROM users u
        JOIN restaurants r ON u.restaurant_id = r.id
        WHERE u.session_id IN (
          SELECT DISTINCT session_id FROM requests 
          WHERE created_at >= ${this.getStartDate(startDate)} 
          AND created_at <= ${adjustedEndDate}
        )
      ` as any[];
      this.logger.log(`Sessions with requests and their restaurant details: ${JSON.stringify(sessionsWithRequestsDetails.map(s => ({
        sessionId: s.session_id,
        restaurantId: s.restaurant_id, 
        tenantId: s.tenant_id
      })))}`);

      if (sessionIds.length > 0) {
        requestFilter.sessionId = { in: sessionIds };
      } else {
        // No sessions found for this tenant - return empty result
        this.logger.log(`No sessions found for tenant ${tenantId} - returning empty results`);
        requestFilter.id = { equals: 'NO_RESULTS' }; // This will return no results
      }
    }

    // Fetch all requests within the date range with their logs, filtered by tenant
    const requests = await this.prisma.request.findMany({
      where: requestFilter,
      include: { 
        logs: { orderBy: { dateTime: 'asc' } },
        user: { include: { waiter: true } }
      },
    });

    this.logger.log(`Found ${requests.length} requests for tenant ${tenantId || 'all'} in date range ${startDate} to ${endDate}`);

    // Debug: Check total requests in database for this date range
    const totalRequestsInDateRange = await this.prisma.request.count({
      where: {
        createdAt: { gte: this.getStartDate(startDate), lte: adjustedEndDate }
      }
    });
    this.logger.log(`Total requests in database for date range: ${totalRequestsInDateRange}`);

    // Debug: Let's check if there are requests for Xolani MABUZA specifically
    if (tenantId) {
      // First, find Xolani MABUZA's waiter record
      const xolaniWaiter = await this.prisma.waiter.findFirst({
        where: {
          OR: [
            { name: { contains: 'Xolani', mode: 'insensitive' } },
            { surname: { contains: 'MABUZA', mode: 'insensitive' } },
            { tag_nickname: { contains: 'xxx', mode: 'insensitive' } }
          ]
        },
        select: { id: true, name: true, surname: true, tag_nickname: true }
      });
      
      if (xolaniWaiter) {
        this.logger.log(`Found Xolani waiter: ${xolaniWaiter.name} ${xolaniWaiter.surname} (${xolaniWaiter.tag_nickname}) - ID: ${xolaniWaiter.id}`);
        
        // Check if this waiter has any sessions
        const xolaniSessions = await this.prisma.user.findMany({
          where: { waiterId: xolaniWaiter.id },
          select: { sessionId: true }
        });
        this.logger.log(`Xolani's current sessions: ${xolaniSessions.map(s => s.sessionId).join(', ')}`);
        
        // Check historical sessions for Xolani
        const xolaniHistoricalSessions = await this.prisma.userSessionLog.findMany({
          where: { 
            actorId: xolaniWaiter.id,
            actorType: 'waiter'
          },
          select: { sessionId: true },
          distinct: ['sessionId']
        });
        this.logger.log(`Xolani's historical sessions: ${xolaniHistoricalSessions.map(s => s.sessionId).join(', ')}`);
        
        // Check if any of these sessions have requests
        const allXolaniSessions = [...new Set([
          ...xolaniSessions.map(s => s.sessionId),
          ...xolaniHistoricalSessions.map(s => s.sessionId)
        ])];
        
        const requestsInXolaniSessions = await this.prisma.request.findMany({
          where: {
            sessionId: { in: allXolaniSessions },
            createdAt: { gte: this.getStartDate(startDate), lte: adjustedEndDate }
          },
          select: { id: true, sessionId: true, createdAt: true, status: true }
        });
        
        this.logger.log(`Requests in Xolani's sessions: ${requestsInXolaniSessions.length} requests`);
        requestsInXolaniSessions.forEach(req => {
          this.logger.log(`  Request ${req.id} in session ${req.sessionId} on ${req.createdAt} - status: ${req.status}`);
        });

        // Debug: Let's also check ALL requests in Xolani's sessions without date filter
        const allRequestsInXolaniSessions = await this.prisma.request.findMany({
          where: {
            sessionId: { in: allXolaniSessions }
          },
          select: { id: true, sessionId: true, createdAt: true, status: true }
        });
        
        this.logger.log(`ALL requests in Xolani's sessions (no date filter): ${allRequestsInXolaniSessions.length} requests`);
        this.logger.log(`Date range: ${startDate} to ${endDate}`);
        this.logger.log(`Date range boundaries: ${this.getStartDate(startDate)} to ${this.getEndDate(endDate)}`);
        allRequestsInXolaniSessions.forEach(req => {
          const withinRange = req.createdAt >= this.getStartDate(startDate) && req.createdAt <= adjustedEndDate;
          this.logger.log(`  Request ${req.id} on ${req.createdAt} - within range? ${withinRange}`);
          this.logger.log(`    startDate check: ${req.createdAt} >= ${this.getStartDate(startDate)} = ${req.createdAt >= this.getStartDate(startDate)}`);
          this.logger.log(`    endDate check: ${req.createdAt} <= ${adjustedEndDate} = ${req.createdAt <= adjustedEndDate}`);
        });
      } else {
        this.logger.log(`Could not find Xolani MABUZA waiter record`);
      }
      
      const requestsWithSessions = await this.prisma.request.findMany({
        where: {
          createdAt: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) }
        },
        select: { sessionId: true, id: true, createdAt: true }
      });
      const sessionIdsWithRequests = requestsWithSessions.map(r => r.sessionId);
      this.logger.log(`Sessions that have requests in date range: ${sessionIdsWithRequests.join(', ')}`);
      
      // Check if our tenant sessions match the sessions with requests
      const tenantSessionIds = Array.isArray(requestFilter.sessionId?.in) ? requestFilter.sessionId.in : [];
      const matchingSessions = sessionIdsWithRequests.filter(sessionId => tenantSessionIds.includes(sessionId));
      this.logger.log(`Matching sessions between tenant and actual requests: ${matchingSessions.join(', ')}`);
    }

    // Calculate metrics using requests_log data
    let totalCompletionTimeSum = 0;
    let completedRequestsCount = 0;
    
    // Track waiter performance for detailed analytics
    const waiterPerformanceMap = new Map<string, {
      totalRequests: number;
      completedRequests: number;
      totalResponseTime: number;
      averageResponseTime: number;
      waiterName: string;
    }>();

    requests.forEach(req => {
      const waiterName = req.user.waiter?.name || 'Unassigned';
      const waiterId = req.user.waiterId || 'unassigned';
      
      // Initialize waiter performance tracking
      if (!waiterPerformanceMap.has(waiterId)) {
        waiterPerformanceMap.set(waiterId, {
          totalRequests: 0,
          completedRequests: 0,
          totalResponseTime: 0,
          averageResponseTime: 0,
          waiterName
        });
      }
      const waiterPerf = waiterPerformanceMap.get(waiterId)!;
      waiterPerf.totalRequests++;

      // Calculate response time (first response after creation)
      // Try new actor-based calculation first
      const firstWaiterLog = req.logs.find(log => 
        (log as any).actor === 'waiter'
      );
      
      const firstUserLog = req.logs.find(log => 
        (log as any).actor === 'user'
      );
      
      if (firstUserLog && firstWaiterLog && firstWaiterLog.dateTime > firstUserLog.dateTime) {
        const responseTime = firstWaiterLog.dateTime.getTime() - firstUserLog.dateTime.getTime();
        waiterPerf.totalResponseTime += responseTime;
      } else if (!firstUserLog && firstWaiterLog) {
        const responseTime = firstWaiterLog.dateTime.getTime() - req.createdAt.getTime();
        waiterPerf.totalResponseTime += responseTime;
      } else {
        // Fallback to old logic if actor field is not available
        const firstResponseLog = req.logs.find(log => 
          log.action.includes("status changed from New to") || 
          log.action.includes("Acknowledged")
        );
        
        if (firstResponseLog) {
          const responseTime = firstResponseLog.dateTime.getTime() - req.createdAt.getTime();
          waiterPerf.totalResponseTime += responseTime;
        }
      }

      // Calculate completion time (from New to Done)
      if (req.status === PrismaRequestStatus.Done) {
        const completionLog = req.logs.find(log => 
          log.action.includes("status changed") && 
          log.action.includes("to Done")
        );
        
        if (completionLog) {
          const completionTime = completionLog.dateTime.getTime() - req.createdAt.getTime();
          totalCompletionTimeSum += completionTime;
          completedRequestsCount++;
          waiterPerf.completedRequests++;
        }
      }
    });

    // Calculate waiter averages
    waiterPerformanceMap.forEach((perf, waiterId) => {
      if (perf.totalRequests > 0) {
        perf.averageResponseTime = perf.totalResponseTime / perf.totalRequests / (1000 * 60); // Convert to minutes
      }
    });

    // Calculate summary metrics
    const totalRequests = requests.length;
    const openRequests = requests.filter(r =>
      r.status === PrismaRequestStatus.New ||
      r.status === PrismaRequestStatus.Acknowledged ||
      r.status === PrismaRequestStatus.InProgress ||
      r.status === PrismaRequestStatus.OnHold
    ).length;
    
    const doneRequests = requests.filter(r => r.status === PrismaRequestStatus.Done).length;
    const cancelledRequests = requests.filter(r => r.status === PrismaRequestStatus.Cancelled).length;
    const totalNonCancelled = totalRequests - cancelledRequests;
    
    const completedRatePercentage = totalNonCancelled > 0 ? (doneRequests / totalNonCancelled) * 100 : 0;
    const cancelledRatePercentage = totalRequests > 0 ? (cancelledRequests / totalRequests) * 100 : 0;
    
    const averageCompletionTimeMinutes = completedRequestsCount > 0 ? 
      (totalCompletionTimeSum / completedRequestsCount / (1000 * 60)) : 0;

    const summaryMetrics: RequestsSummaryMetrics = {
      totalRequests,
      openRequests,
      averageResponseTimeMinutes: parseFloat(averageCompletionTimeMinutes.toFixed(1)),
      completionRatePercentage: parseFloat(completedRatePercentage.toFixed(1)),
      cancelledRatePercentage: parseFloat(cancelledRatePercentage.toFixed(1)),
      completedRequests: doneRequests,
      cancelledRequests
    };

    // Status distribution
    const statusCounts = await this.prisma.request.groupBy({
      by: ['status'],
      _count: { id: true },
      where: requestFilter, // Use the same tenant filter as the main request query
    });
    const statusDistribution: RequestStatusDistribution[] = statusCounts.map(s => ({ 
      name: s.status.toString(), 
      value: s._count.id 
    }));

    // Requests over time
    const requestsOverTimeMap = new Map<string, { newRequests: number; resolvedRequests: number }>();
    eachDayOfInterval({ start: this.getStartDate(startDate), end: this.getEndDate(endDate) }).forEach(day => {
      requestsOverTimeMap.set(format(day, 'yyyy-MM-dd'), { newRequests: 0, resolvedRequests: 0 });
    });
    
    requests.forEach(req => {
      const day = format(req.createdAt, 'yyyy-MM-dd');
      const current = requestsOverTimeMap.get(day) || { newRequests: 0, resolvedRequests: 0 };
      current.newRequests += 1;
      if (req.status === PrismaRequestStatus.Done) {
        current.resolvedRequests += 1;
      }
      requestsOverTimeMap.set(day, current);
    });
    const requestsOverTime: RequestsOverTimeDataPoint[] = Array.from(requestsOverTimeMap.entries())
      .map(([time, data]) => ({ time, ...data }));

    // Waiter response times and performance
    const waiterResponseTimes: WaiterResponseTimeDataPoint[] = Array.from(waiterPerformanceMap.entries())
      .map(([waiterId, perf]) => ({
        name: perf.waiterName,
        value: parseFloat(perf.averageResponseTime.toFixed(1)),
        waiterId,
        waiterName: perf.waiterName,
        averageResponseTime: parseFloat(perf.averageResponseTime.toFixed(1))
      }));

    const waiterRequestPerformance: StaffPerformanceDetail[] = Array.from(waiterPerformanceMap.entries())
      .map(([waiterId, perf]) => ({
        staffId: waiterId,
        staffName: perf.waiterName,
        position: 'Waiter',
        shiftsWorked: 0, // Would need shift data to calculate
        totalHoursWorked: 0, // Would need shift data to calculate
        totalRequests: perf.totalRequests,
        completedRequests: perf.completedRequests,
        averageResponseTime: parseFloat(perf.averageResponseTime.toFixed(1)),
        completionRate: perf.totalRequests > 0 ? 
          parseFloat(((perf.completedRequests / perf.totalRequests) * 100).toFixed(1)) : 0
      }));

    return { 
      summaryMetrics, 
      statusDistribution, 
      requestsOverTime, 
      waiterResponseTimes, 
      waiterRequestPerformance 
    };
  }

  async getCustomerRatingsAnalytics(dateRange?: DateRange, tenantId?: string): Promise<CustomerRatingsAnalyticsData> {
    const methodStartTime = Date.now();
    this.logger.log(`[CACHE] Starting getCustomerRatingsAnalytics for tenant: ${tenantId || 'unknown'}, dateRange: ${JSON.stringify(dateRange)}`);
    
    // Check cache first if tenantId is provided
    if (tenantId) {
      const cacheKey = `getCustomerRatingsAnalytics_${tenantId}_${JSON.stringify(dateRange)}`;
      this.logger.log(`[CACHE] Checking cache with key: ${cacheKey}`);
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        const cacheTime = Date.now() - methodStartTime;
        this.logger.log(`[CACHE HIT] ✅ Returning cached customer ratings analytics for tenant ${tenantId} in ${cacheTime}ms - NO LLM CALL MADE`);
        return cachedResult;
      } else {
        this.logger.log(`[CACHE MISS] ❌ No cached data found for tenant ${tenantId} - will fetch fresh data and call LLM`);
      }
    } else {
      this.logger.log(`[CACHE] No tenant ID provided - skipping cache check`);
    }

    const { startDate, endDate } = dateRange || this.getDefaultDateRange(30);
    
    // Adjust endDate to include end-of-day timestamps
    const adjustedEndDate = this.getEndDate(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);
    
    this.logger.log(`[DATA FETCH] Fetching overall sentiments analytics from ${startDate} to ${adjustedEndDate} for tenant: ${tenantId || 'all'}`);

    try {
      let requestLogs: any[] = [];
      
      if (tenantId) {
        // Get tenant's restaurants first
        const tenantRestaurants = await this.prisma.restaurant.findMany({
          where: { tenantId },
          select: { id: true }
        });
        
        const restaurantIds = tenantRestaurants.map(r => r.id);
        this.logger.log(`[TENANT FILTER] Found ${restaurantIds.length} restaurants for tenant ${tenantId}`);
        
        if (restaurantIds.length > 0) {
          // Fetch request logs using session-based tenant filtering
          requestLogs = await this.prisma.requestLog.findMany({
            where: { 
              dateTime: { gte: this.getStartDate(startDate), lte: adjustedEndDate },
              request: {
                user: {
                  restaurantId: { in: restaurantIds }
                }
              }
            },
            include: {
              request: {
                include: {
                  user: {
                    include: {
                      waiter: true
                    }
                  }
                }
              }
            },
            orderBy: { dateTime: 'asc' }
          });
        }
      } else {
        // Fetch all request logs if no tenant filtering
        requestLogs = await this.prisma.requestLog.findMany({
          where: { 
            dateTime: { gte: this.getStartDate(startDate), lte: adjustedEndDate }
          },
          include: {
            request: {
              include: {
                user: {
                  include: {
                    waiter: true
                  }
                }
              }
            }
          },
          orderBy: { dateTime: 'asc' }
        });
      }

      this.logger.log(`[DATA FETCH] Found ${requestLogs.length} request logs`);

    // Base filter for service analysis - include tenant filtering if tenantId provided
    const serviceAnalysisFilter: any = {
      serviceType: 'request',
      createdAt: { gte: this.getStartDate(startDate), lte: adjustedEndDate }
    };
    
    if (tenantId) {
      // Get tenant's restaurants first
      const tenantRestaurants = await this.prisma.restaurant.findMany({
        where: { tenantId },
        select: { id: true }
      });
      
      const restaurantIds = tenantRestaurants.map(r => r.id);
      
      if (restaurantIds.length > 0) {
        // Filter service analysis using session-based tenant filtering
        serviceAnalysisFilter.user = {
          restaurantId: { in: restaurantIds }
        };
      } else {
        // If no restaurants found for tenant, return empty results
        serviceAnalysisFilter.id = { in: [] };
      }
    }

    // Fetch service analysis data for request-type feedback, filtered by tenant
    const serviceAnalysis = await this.prisma.serviceAnalysis.findMany({
      where: serviceAnalysisFilter,
      include: {
        user: {
          include: {
            waiter: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    this.logger.log(`[DATA FETCH] Found ${serviceAnalysis.length} service analysis records`);

    // Prepare data for AI analysis
    const analysisData = {
      requestLogs: requestLogs.map(log => ({
        action: log.action,
        dateTime: log.dateTime,
        waiterName: log.request.user.waiter?.name || 'Unassigned',
        requestContent: log.request.content,
        requestStatus: log.request.status
      })),
      serviceAnalysis: serviceAnalysis.map(analysis => ({
        rating: analysis.rating,
        analysis: analysis.analysis,
        serviceType: analysis.serviceType,
        waiterName: analysis.user.waiter?.name || 'Unassigned',
        createdAt: analysis.createdAt
      })),
      dateRange: `${startDate} to ${endDate}`,
      totalRequests: requestLogs.length,
      totalServiceAnalysis: serviceAnalysis.length
    };

    // Generate AI sentiment analysis
    this.logger.log(`[LLM] 🤖 Starting LLM sentiment analysis with ${analysisData.requestLogs.length} request logs and ${analysisData.serviceAnalysis.length} service analysis items`);
    const llmStartTime = Date.now();
    const sentimentAnalysis = await this.generateSentimentAnalysis(analysisData);
    const llmEndTime = Date.now();
    this.logger.log(`[LLM] ✅ LLM sentiment analysis completed in ${llmEndTime - llmStartTime}ms`);

    // Calculate overall restaurant rating from service analysis data
    const overallRestaurantRating: OverallRestaurantRating = {
      averageOverallRating: serviceAnalysis.length > 0 ? parseFloat((serviceAnalysis.reduce((sum, sa) => sum + sa.rating, 0) / serviceAnalysis.length).toFixed(1)) : 0,
      totalReviews: serviceAnalysis.length,
    };
    
    const satisfactionTrendMap = new Map<string, { sum: number; count: number }>();
    serviceAnalysis.forEach(sa => {
      const day = format(sa.createdAt, 'yyyy-MM-dd');
      const current = satisfactionTrendMap.get(day) || { sum: 0, count: 0 };
      // Use rating from service analysis for trending
      current.sum += sa.rating;
      current.count += 1;
      satisfactionTrendMap.set(day, current);
    });
    
    const satisfactionTrend: CustomerSatisfactionTrendDataPoint[] = Array.from(satisfactionTrendMap.entries()).map(([date, data]) => ({
      date, 
      satisfactionScore: data.count > 0 ? parseFloat((data.sum/data.count).toFixed(1)) : 0
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const topFeedbackThemes: FeedbackTheme[] = sentimentAnalysis.commonThemes.slice(0, 5);

    const rawDataSummary = {
      totalRequestLogs: requestLogs.length,
      totalServiceAnalysis: serviceAnalysis.length,
      dateRange: `${startDate} to ${endDate}`
    };

    const result = { 
      overallRestaurantRating, 
      satisfactionTrend, 
      topFeedbackThemes, 
      sentimentAnalysis,
      rawDataSummary
    };

    // Cache the result if tenantId is provided
    if (tenantId) {
      const cacheKey = `getCustomerRatingsAnalytics_${tenantId}_${JSON.stringify(dateRange)}`;
      this.cacheService.set(cacheKey, result);
      const totalTime = Date.now() - methodStartTime;
      this.logger.log(`[CACHE STORE] 💾 Cached customer ratings analytics for tenant ${tenantId} (total method time: ${totalTime}ms)`);
    } else {
      const totalTime = Date.now() - methodStartTime;
      this.logger.log(`[NO CACHE] Result not cached (no tenant ID) - total method time: ${totalTime}ms`);
    }

    return result;
    } catch (error) {
      this.logger.error('Failed to fetch customer ratings analytics:', error);
      throw new Error('Failed to load customer ratings analytics');
    }
  }

  private async generateSentimentAnalysis(data: any): Promise<SentimentAnalysisResult> {
    try {
      const prompt = `
Analyze the following restaurant request handling and service feedback data to provide comprehensive insights:

REQUEST LOGS DATA:
${JSON.stringify(data.requestLogs.slice(0, 50), null, 2)}

SERVICE ANALYSIS DATA:
${JSON.stringify(data.serviceAnalysis.slice(0, 50), null, 2)}

DATE RANGE: ${data.dateRange}
TOTAL REQUEST LOGS: ${data.totalRequests}
TOTAL SERVICE ANALYSIS: ${data.totalServiceAnalysis}

Please provide a comprehensive analysis in the following JSON format:
{
  "overallSentiment": "positive|negative|neutral",
  "sentimentScore": number between -1 and 1,
  "keyInsights": ["insight1", "insight2", "insight3"],
  "commonThemes": [
    {"name": "theme", "value": count, "sentiment": "positive|negative|neutral"}
  ],
  "waiterPerformanceInsights": [
    {
      "waiterName": "name",
      "sentimentTrend": "improving|declining|stable",
      "keyStrengths": ["strength1", "strength2"],
      "areasForImprovement": ["area1", "area2"]
    }
  ],
  "businessValue": {
    "riskAreas": ["risk1", "risk2"],
    "opportunities": ["opportunity1", "opportunity2"],
    "priorityActions": ["action1", "action2", "action3"]
  }
}

Focus on:
1. Request resolution patterns and efficiency
2. Service quality trends
3. Waiter performance variations
4. Customer satisfaction indicators
5. Business impact and actionable recommendations
`;

      this.logger.log(`[OPENAI] 🚀 Making OpenAI API call to gpt-4o for sentiment analysis...`);
      const openaiStartTime = Date.now();
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Today's date is: ${new Date().toISOString().split('T')[0]}. You are an expert restaurant analytics consultant specializing in service quality and operational efficiency analysis. Provide actionable insights based on request handling and service feedback data.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "sentiment_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  overallSentiment: {
                    type: "string",
                    enum: ["positive", "negative", "neutral"]
                  },
                  sentimentScore: {
                    type: "number",
                    minimum: -1,
                    maximum: 1
                  },
                  keyInsights: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 5
                  },
                  commonThemes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        value: { type: "number" },
                        sentiment: {
                          type: "string",
                          enum: ["positive", "negative", "neutral"]
                        }
                      },
                      required: ["name", "value", "sentiment"],
                      additionalProperties: false
                    }
                  },
                  waiterPerformanceInsights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        waiterName: { type: "string" },
                        sentimentTrend: {
                          type: "string",
                          enum: ["improving", "declining", "stable"]
                        },
                        keyStrengths: {
                          type: "array",
                          items: { type: "string" }
                        },
                        areasForImprovement: {
                          type: "array",
                          items: { type: "string" }
                        }
                      },
                      required: ["waiterName", "sentimentTrend", "keyStrengths", "areasForImprovement"],
                      additionalProperties: false
                    }
                  },
                  businessValue: {
                    type: "object",
                    properties: {
                      riskAreas: {
                        type: "array",
                        items: { type: "string" }
                      },
                      opportunities: {
                        type: "array",
                        items: { type: "string" }
                      },
                      priorityActions: {
                        type: "array",
                        items: { type: "string" }
                      }
                    },
                    required: ["riskAreas", "opportunities", "priorityActions"],
                    additionalProperties: false
                  }
                },
                required: ["overallSentiment", "sentimentScore", "keyInsights", "commonThemes", "waiterPerformanceInsights", "businessValue"],
                additionalProperties: false
              }
            }
          }
        })
      });

      if (!response.ok) {
        this.logger.error(`[OPENAI] ❌ OpenAI API error: ${response.statusText}`);
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const aiResponse = await response.json();
      const openaiEndTime = Date.now();
      this.logger.log(`[OPENAI] ✅ OpenAI API call completed in ${openaiEndTime - openaiStartTime}ms`);
      
      const content = aiResponse.choices[0].message.content;
      
      // With structured output, the content should be valid JSON
      let analysisResult;
      try {
        analysisResult = JSON.parse(content);
        this.logger.log(`[OPENAI] 📊 Successfully parsed sentiment analysis result`);
      } catch (parseError) {
        this.logger.error('Failed to parse structured AI response as JSON:', parseError);
        this.logger.error('Response content:', content);
        throw new Error('AI service returned invalid structured output');
      }

      return analysisResult;
    } catch (error) {
      this.logger.error('Failed to generate AI sentiment analysis:', error);
      
      // Fallback analysis if AI fails
      return {
        overallSentiment: 'neutral',
        sentimentScore: 0,
        keyInsights: [
          'AI analysis temporarily unavailable',
        ],
        commonThemes: [
          { name: 'Request Resolution', value: data.totalRequests, sentiment: 'neutral' },
          { name: 'Service Quality', value: data.totalServiceAnalysis, sentiment: 'neutral' }
        ],
        waiterPerformanceInsights: [],
        businessValue: {
          riskAreas: ['AI Unavailable'],
          opportunities: ['AI Unavailable'],
          priorityActions: ['AI Unavailable']
        }
      };
    }
  }

  /**
   * Enhanced Staff Performance Analytics for Owner Dashboard
   * Combines data from requests, requests_log, service_analysis, and chat_messages
   * Uses LLM analysis to derive insights and trends
   */
  async getStaffPerformanceAnalytics(
    dateRange?: DateRange,
    waiterId?: string,
    sortBy?: string,
    adminSessionId?: string,
    tenantId?: string
  ): Promise<StaffPerformanceAnalytics> {
    // Check cache first if adminSessionId is provided
    if (adminSessionId) {
      const cacheKey = `getStaffPerformanceAnalytics_${adminSessionId}_${JSON.stringify(dateRange)}_${waiterId || 'all'}_${sortBy || 'default'}`;
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.log(`Returning cached staff performance analytics for admin ${adminSessionId}`);
        return cachedResult;
      }
    }

    const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : subDays(new Date(), 30);
    const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date();

    try {
      this.logger.log(`Fetching staff performance analytics from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Get all waiters with tenant filtering if provided
      let waiterFilter: any = {};
      if (tenantId) {
        // Get tenant's restaurants for filtering
        const tenantRestaurants = await this.prisma.restaurant.findMany({
          where: { tenantId },
          select: { id: true }
        });
        const restaurantIds = tenantRestaurants.map(r => r.id);
        
        if (restaurantIds.length > 0) {
          waiterFilter.restaurantId = { in: restaurantIds };
        } else {
          // If no restaurants found for tenant, return empty results
          waiterFilter.id = { in: [] };
        }
      }

      const waiters = await this.prisma.waiter.findMany({
        where: waiterFilter,
        select: {
          id: true,
          name: true,
          surname: true,
          tag_nickname: true,
        }
      });

      if (waiters.length === 0) {
        throw new Error('No waiters found in the system');
      }

      // Gather raw data for LLM analysis
      const rawAnalysisData = await this.gatherRawStaffDataForLLM(waiters, startDate, endDate, waiterId, tenantId);
      
      // Use LLM to analyze the data and generate insights
      let llmAnalysis;
      try {
        llmAnalysis = await this.generateLLMStaffAnalysis(rawAnalysisData);
      } catch (llmError) {
        this.logger.warn('LLM analysis failed, continuing with basic analysis:', llmError);
        llmAnalysis = null;
      }

      // Get request metrics for each waiter
      const staffMetrics: WaiterPerformanceMetrics[] = [];

      for (const waiter of waiters) {
        // Filter by specific waiter if requested
        if (waiterId && waiterId !== 'all' && waiter.id !== waiterId) {
          continue;
        }

        // Get requests handled by this waiter (through user assignments)
        const userSessions = await this.prisma.user.findMany({
          where: {
            waiterId: waiter.id,
            createdAt: {
              gte: startDate,
              lte: endDate,
            }
          },
          select: {
            id: true,
            sessionId: true,
            createdAt: true,
          }
        });

        if (userSessions.length === 0) {
          // If no sessions, still include waiter with zero metrics
          staffMetrics.push({
            waiterId: waiter.id,
            waiterName: `${waiter.name} ${waiter.surname}`,
            totalRequests: 0,
            completedRequests: 0,
            completionRate: 0,
            avgResponseTime: 0,
            avgRating: 0,
            sentimentScore: 0,
            activeHours: 0,
            requestsPerHour: 0,
            trends: { week: 'stable', month: 'stable' },
            ratingBreakdown: {
              friendliness: 0,
              orderAccuracy: 0,
              speed: 0,
              attentiveness: 0,
              knowledge: 0,
            }
          });
          continue;
        }

        const userIds = userSessions.map(u => u.id);

        // Get all requests for these users
        const requests = await this.prisma.request.findMany({
          where: {
            userId: { in: userIds },
            createdAt: {
              gte: startDate,
              lte: endDate,
            }
          },
          include: {
            logs: {
              orderBy: { dateTime: 'asc' }
            }
          }
        });

        // Calculate completion rate and response times
        const completedRequests = requests.filter(r => 
          r.status === 'Completed' || r.status === 'Done'
        );

        const responseTimes: number[] = [];
        for (const request of requests) {
          // Try new actor-based calculation first
          const firstUserLog = request.logs.find(log => 
            (log as any).actor === 'user'
          );
          
          const firstWaiterLog = request.logs.find(log => 
            (log as any).actor === 'waiter'
          );
          
          // Calculate response time using actor field if available
          if (firstUserLog && firstWaiterLog && firstWaiterLog.dateTime > firstUserLog.dateTime) {
            const responseTime = (firstWaiterLog.dateTime.getTime() - firstUserLog.dateTime.getTime()) / (1000 * 60); // minutes
            responseTimes.push(responseTime);
          }
          // Fallback to creation time if no user log exists but waiter log exists
          else if (!firstUserLog && firstWaiterLog) {
            const responseTime = (firstWaiterLog.dateTime.getTime() - request.createdAt.getTime()) / (1000 * 60); // minutes
            responseTimes.push(responseTime);
          }
          // Fallback to old logic if actor field is not available
          else {
            const firstLog = request.logs.find(log => 
              log.action.includes('acknowledged') || log.action.includes('in_progress')
            );
            if (firstLog) {
              const responseTime = (firstLog.dateTime.getTime() - request.createdAt.getTime()) / (1000 * 60); // minutes
              responseTimes.push(responseTime);
            }
          }
        }

        const avgResponseTime = responseTimes.length > 0 
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
          : 0;

        // Get service analysis ratings
        const serviceAnalysisRatings = await this.prisma.serviceAnalysis.findMany({
          where: {
            waiterId: waiter.id,
            createdAt: {
              gte: startDate,
              lte: endDate,
            }
          }
        });

        const avgRating = serviceAnalysisRatings.length > 0
          ? serviceAnalysisRatings.reduce((sum, r) => sum + r.rating, 0) / serviceAnalysisRatings.length
          : 0;

        // Since service_analysis only has a single rating field, we'll provide default breakdown
        const ratingBreakdown = {
          friendliness: avgRating,
          orderAccuracy: avgRating,
          speed: avgRating,
          attentiveness: avgRating,
          knowledge: avgRating,
        };

        // Get sentiment score from service analysis
        const serviceAnalysis = await this.prisma.serviceAnalysis.findMany({
          where: {
            waiterId: waiter.id,
            createdAt: {
              gte: startDate,
              lte: endDate,
            }
          }
        });

        const sentimentScore = serviceAnalysis.length > 0
          ? serviceAnalysis.reduce((sum, s) => sum + s.rating, 0) / serviceAnalysis.length * 20 // Convert 1-5 to 0-100
          : 0;

        // Calculate active hours (approximate based on session duration)
        const sessionDurations = userSessions.map(session => {
          // Rough estimate: assume each session lasts 2 hours on average
          return 2;
        });
        const activeHours = sessionDurations.reduce((sum, duration) => sum + duration, 0);

        // Calculate trends (compare with previous periods)
        const previousPeriodStart = new Date(startDate);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - (endDate.getDate() - startDate.getDate()));
        const previousPeriodEnd = startDate;

        const previousRequests = await this.prisma.request.findMany({
          where: {
            userId: { in: userIds },
            createdAt: {
              gte: previousPeriodStart,
              lte: previousPeriodEnd,
            }
          }
        });

        const currentCompletionRate = requests.length > 0 ? (completedRequests.length / requests.length) * 100 : 0;
        const previousCompletionRate = previousRequests.length > 0 
          ? (previousRequests.filter(r => r.status === 'Completed' || r.status === 'Done').length / previousRequests.length) * 100 
          : 0;

        const weekTrend = llmAnalysis?.waiterTrends?.[waiter.id]?.weekTrend || 
          (currentCompletionRate > previousCompletionRate + 5 ? 'up' 
            : currentCompletionRate < previousCompletionRate - 5 ? 'down' 
            : 'stable');

        const monthTrend = llmAnalysis?.waiterTrends?.[waiter.id]?.monthTrend || weekTrend;

        staffMetrics.push({
          waiterId: waiter.id,
          waiterName: `${waiter.name} ${waiter.surname}`,
          totalRequests: requests.length,
          completedRequests: completedRequests.length,
          completionRate: currentCompletionRate,
          avgResponseTime: avgResponseTime,
          avgRating: avgRating,
          sentimentScore: sentimentScore,
          activeHours: activeHours,
          requestsPerHour: activeHours > 0 ? requests.length / activeHours : 0,
          trends: { week: weekTrend, month: monthTrend },
          ratingBreakdown: ratingBreakdown,
        });
      }

      // Sort staff metrics based on sortBy parameter
      if (sortBy) {
        staffMetrics.sort((a, b) => {
          switch (sortBy) {
            case 'completion-rate':
              return b.completionRate - a.completionRate;
            case 'response-time':
              return a.avgResponseTime - b.avgResponseTime;
            case 'rating':
              return b.avgRating - a.avgRating;
            case 'productivity':
              return b.requestsPerHour - a.requestsPerHour;
            default:
              return b.completionRate - a.completionRate;
          }
        });
      }

      // Calculate overview metrics
      const totalStaff = staffMetrics.length;
      
      // Find the true top performer - must have handled requests and have good performance
      const topPerformer = (() => {
        const activeStaff = staffMetrics.filter(s => s.totalRequests > 0);
        if (activeStaff.length === 0) return 'N/A';
        
        // Calculate a composite score: completion rate (70%) + efficiency (30%)
        const staffWithScores = activeStaff.map(staff => ({
          ...staff,
          compositeScore: (staff.completionRate * 0.7) + 
                         ((staff.requestsPerHour / Math.max(...activeStaff.map(s => s.requestsPerHour))) * 100 * 0.3)
        }));
        
        // Sort by composite score and return the best performer
        staffWithScores.sort((a, b) => b.compositeScore - a.compositeScore);
        return staffWithScores[0].waiterName;
      })();
      const avgCompletionRate = staffMetrics.length > 0
        ? staffMetrics.reduce((sum, s) => sum + s.completionRate, 0) / staffMetrics.length
        : 0;
      const avgResponseTime = staffMetrics.length > 0
        ? staffMetrics.reduce((sum, s) => sum + s.avgResponseTime, 0) / staffMetrics.length
        : 0;

      // Generate productivity trend (last 7 days)
      const productivityTrend: TeamProductivityTrend[] = [];
      for (let i = 6; i >= 0; i--) {
        const trendDate = new Date(endDate);
        trendDate.setDate(trendDate.getDate() - i);
        
        // Calculate productivity and efficiency for this day
        const dayRequests = await this.prisma.request.count({
          where: {
            createdAt: {
              gte: startOfDay(trendDate),
              lte: endOfDay(trendDate),
            }
          }
        });

        const dayCompleted = await this.prisma.request.count({
          where: {
            createdAt: {
              gte: startOfDay(trendDate),
              lte: endOfDay(trendDate),
            },
            status: { in: ['Completed', 'Done'] }
          }
        });

        const productivity = dayRequests > 0 ? (dayCompleted / dayRequests) * 100 : 0;
        const efficiency = Math.min(productivity + Math.random() * 10, 100); // Add some variance for demo

        productivityTrend.push({
          date: format(trendDate, 'yyyy-MM-dd'),
          productivity: Math.round(productivity),
          efficiency: Math.round(efficiency),
        });
      }

      // Service quality metrics
      const serviceQuality: ServiceQualityMetric[] = [
        { metric: 'Response Time', score: Math.max(0, 100 - avgResponseTime * 10), target: 90 },
        { metric: 'Completion Rate', score: avgCompletionRate, target: 85 },
        { metric: 'Customer Satisfaction', score: staffMetrics.reduce((sum, s) => sum + s.avgRating, 0) / staffMetrics.length * 20, target: 88 },
        { metric: 'Service Quality', score: staffMetrics.reduce((sum, s) => sum + s.sentimentScore, 0) / staffMetrics.length, target: 90 },
        { metric: 'Team Collaboration', score: 85, target: 82 }, // Mock data for now
      ];

      // Workload distribution
      const workloadDistribution: WorkloadDistribution[] = staffMetrics.slice(0, 5).map(staff => ({
        waiter: staff.waiterName.split(' ')[0] + ' ' + staff.waiterName.split(' ')[1]?.charAt(0) + '.',
        requests: staff.totalRequests,
        hours: staff.activeHours,
      }));

      const overview: StaffPerformanceOverview = {
        totalStaff,
        topPerformer,
        avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        performanceGrowth: llmAnalysis?.performanceGrowth || 15.3, // Use LLM insight or fallback
      };

      const result = {
        overview,
        staffRankings: staffMetrics,
        teamMetrics: {
          productivityTrend,
          serviceQuality,
          workloadDistribution,
        },
      };

      // Cache the result if adminSessionId is provided
      if (adminSessionId) {
        const cacheKey = `getStaffPerformanceAnalytics_${adminSessionId}_${JSON.stringify(dateRange)}_${waiterId || 'all'}_${sortBy || 'default'}`;
        this.cacheService.set(cacheKey, result);
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to fetch staff performance analytics:', error);
      
      // Return meaningful error when LLM is required but unavailable
      if (error.message?.includes('LLM analysis service is currently unavailable')) {
        throw new Error('LLM analysis service is currently unavailable. Please try again later.');
      }
      
      throw error;
    }
  }

  /**
   * Gather raw data from all relevant tables for LLM analysis
   */
  private async gatherRawStaffDataForLLM(waiters: any[], startDate: Date, endDate: Date, waiterId?: string, tenantId?: string) {
    const waiterIds = waiterId && waiterId !== 'all' ? [waiterId] : waiters.map(w => w.id);

    // Adjust endDate to include end-of-day timestamps for comprehensive data collection
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);

    this.logger.log(`[COMPREHENSIVE DATA] Gathering comprehensive data from ${startDate} to ${adjustedEndDate} for ${waiterIds.length} waiters`);

    let restaurantIds: string[] = [];
    if (tenantId) {
      // Get tenant's restaurants for filtering
      const tenantRestaurants = await this.prisma.restaurant.findMany({
        where: { tenantId },
        select: { id: true }
      });
      restaurantIds = tenantRestaurants.map(r => r.id);
      this.logger.log(`[TENANT FILTER] Found ${restaurantIds.length} restaurants for tenant ${tenantId}`);
    }

    // Build comprehensive filter for user sessions (session-aware approach)
    const userSessionFilter: any = {
      waiterId: { in: waiterIds },
      createdAt: { gte: startDate, lte: adjustedEndDate }
    };
    
    if (tenantId && restaurantIds.length > 0) {
      userSessionFilter.restaurantId = { in: restaurantIds };
    }

    // Get all user sessions assigned to these waiters with comprehensive includes
    const userSessions = await this.prisma.user.findMany({
      where: userSessionFilter,
      include: {
        requests: {
          include: {
            logs: { orderBy: { dateTime: 'asc' } }
          }
        },
        orders: {
          include: {
            orderItems: {
              include: {
                menuItem: true
              }
            },
            logs: { orderBy: { dateTime: 'asc' } }
          }
        },
        chatMessages: true,
        serviceAnalysis: true,
        waiter: {
          select: {
            id: true,
            name: true,
            surname: true,
            tag_nickname: true
          }
        }
      }
    });

    // Get service analysis with session-based tenant filtering
    const serviceAnalysisFilter: any = {
      waiterId: { in: waiterIds },
      createdAt: { gte: startDate, lte: adjustedEndDate }
    };

    if (tenantId && restaurantIds.length > 0) {
      serviceAnalysisFilter.user = {
        restaurantId: { in: restaurantIds }
      };
    }

    const serviceAnalyses = await this.prisma.serviceAnalysis.findMany({
      where: serviceAnalysisFilter,
      include: {
        user: {
          include: {
            waiter: true
          }
        },
        waiter: true,
      }
    });

    // Get user session logs for activity tracking
    const userSessionLogFilter: any = {
      actorId: { in: waiterIds },
      actorType: 'waiter',
      dateTime: { gte: startDate, lte: adjustedEndDate }
    };

    const userSessionLogs = await this.prisma.userSessionLog.findMany({
      where: userSessionLogFilter,
      orderBy: { dateTime: 'asc' }
    });

    // Get additional order data that might not be captured through user sessions
    const orderFilter: any = {
      createdAt: { gte: startDate, lte: adjustedEndDate }
    };

    if (tenantId && restaurantIds.length > 0) {
      // Filter orders through user sessions belonging to tenant restaurants
      orderFilter.user = {
        restaurantId: { in: restaurantIds }
      };
    }

    const additionalOrders = await this.prisma.order.findMany({
      where: orderFilter,
      include: {
        orderItems: {
          include: {
            menuItem: true
          }
        },
        logs: { orderBy: { dateTime: 'asc' } },
        user: {
          include: {
            waiter: true
          }
        }
      }
    });

    // Get additional request data for comprehensive analysis
    const requestFilter: any = {
      createdAt: { gte: startDate, lte: adjustedEndDate }
    };

    if (tenantId && restaurantIds.length > 0) {
      requestFilter.user = {
        restaurantId: { in: restaurantIds }
      };
    }

    const additionalRequests = await this.prisma.request.findMany({
      where: requestFilter,
      include: {
        logs: { orderBy: { dateTime: 'asc' } },
        user: {
          include: {
            waiter: true
          }
        }
      }
    });

    this.logger.log(`[DATA SUMMARY] Collected: ${userSessions.length} sessions, ${serviceAnalyses.length} service analyses, ${userSessionLogs.length} session logs, ${additionalOrders.length} orders, ${additionalRequests.length} requests`);

    return {
      waiters,
      userSessions,
      serviceAnalyses,
      userSessionLogs,
      additionalOrders,
      additionalRequests,
      dateRange: { startDate, endDate: adjustedEndDate },
      tenantId,
      restaurantIds
    };
  }

  /**
   * Use LLM to analyze raw staff data and generate insights
   */
  private async generateLLMStaffAnalysis(rawData: any): Promise<any> {
    try {
      // Calculate comprehensive metrics from all data sources
      const totalRequests = rawData.userSessions.reduce((sum: number, session: any) => sum + session.requests.length, 0) + 
        (rawData.additionalRequests?.length || 0);
      const totalCompletedRequests = rawData.userSessions.reduce((sum: number, session: any) => 
        sum + session.requests.filter((r: any) => r.status === 'Completed' || r.status === 'Done').length, 0) + 
        (rawData.additionalRequests?.filter((r: any) => r.status === 'Completed' || r.status === 'Done')?.length || 0);
      
      const totalOrders = rawData.userSessions.reduce((sum: number, session: any) => sum + session.orders.length, 0) + 
        (rawData.additionalOrders?.length || 0);
      const totalCompletedOrders = rawData.userSessions.reduce((sum: number, session: any) => 
        sum + session.orders.filter((o: any) => o.status === 'Complete' || o.status === 'Delivered').length, 0) + 
        (rawData.additionalOrders?.filter((o: any) => o.status === 'Complete' || o.status === 'Delivered')?.length || 0);
      
      const totalRatings = rawData.serviceAnalyses.length;
      const avgRating = totalRatings > 0 ? 
        rawData.serviceAnalyses.reduce((sum: number, r: any) => sum + r.rating, 0) / totalRatings : 0;

      const totalChatMessages = rawData.userSessions.reduce((sum: number, session: any) => sum + session.chatMessages.length, 0);
      const totalSessionActivities = rawData.userSessionLogs?.length || 0;

      // Calculate revenue from orders
      const totalRevenue = [...(rawData.userSessions || []), ...(rawData.additionalOrders || [])]
        .reduce((sum: number, orderOrSession: any) => {
          const orders = orderOrSession.orders || [orderOrSession];
          return sum + orders.reduce((orderSum: number, order: any) => {
            return orderSum + (order.orderItems || []).reduce((itemSum: number, item: any) => {
              return itemSum + (item.price * item.quantity);
            }, 0);
          }, 0);
        }, 0);

      const analysisPrompt = `Analyze the following comprehensive restaurant staff performance data and provide insights:

COMPREHENSIVE DATA SUMMARY:
- Analysis Period: ${rawData.dateRange.startDate} to ${rawData.dateRange.endDate}
- Tenant Filter: ${rawData.tenantId ? `Applied (${rawData.restaurantIds?.length || 0} restaurants)` : 'None (all data)'}
- Total Waiters: ${rawData.waiters.length}
- Total Requests: ${totalRequests} (Completed: ${totalCompletedRequests}, Rate: ${totalRequests > 0 ? ((totalCompletedRequests / totalRequests) * 100).toFixed(1) : 0}%)
- Total Orders: ${totalOrders} (Completed: ${totalCompletedOrders}, Rate: ${totalOrders > 0 ? ((totalCompletedOrders / totalOrders) * 100).toFixed(1) : 0}%)
- Total Revenue: $${totalRevenue.toFixed(2)}
- Total Service Ratings: ${totalRatings} (Average: ${avgRating.toFixed(2)}/5)
- Total Chat Messages: ${totalChatMessages}
- Total Session Activities: ${totalSessionActivities}

DETAILED WAITER PERFORMANCE DATA:
${rawData.waiters.map((waiter: any) => {
  const waiterSessions = rawData.userSessions.filter((s: any) => s.waiterId === waiter.id);
  const waiterRequests = waiterSessions.reduce((sum: number, s: any) => sum + s.requests.length, 0);
  const waiterCompletedRequests = waiterSessions.reduce((sum: number, s: any) => 
    sum + s.requests.filter((r: any) => r.status === 'Completed' || r.status === 'Done').length, 0);
  const waiterOrders = waiterSessions.reduce((sum: number, s: any) => sum + s.orders.length, 0);
  const waiterCompletedOrders = waiterSessions.reduce((sum: number, s: any) => 
    sum + s.orders.filter((o: any) => o.status === 'Complete' || o.status === 'Delivered').length, 0);
  const waiterServiceAnalyses = rawData.serviceAnalyses.filter((r: any) => r.waiterId === waiter.id);
  const waiterAvgRating = waiterServiceAnalyses.length > 0 ? 
    waiterServiceAnalyses.reduce((sum: number, r: any) => sum + r.rating, 0) / waiterServiceAnalyses.length : 0;
  const waiterChatMessages = waiterSessions.reduce((sum: number, s: any) => sum + s.chatMessages.length, 0);
  const waiterSessionActivities = rawData.userSessionLogs?.filter((l: any) => l.actorId === waiter.id)?.length || 0;
  
  // Calculate revenue for this waiter
  const waiterRevenue = waiterSessions.reduce((sum: number, session: any) => {
    return sum + session.orders.reduce((orderSum: number, order: any) => {
      return orderSum + (order.orderItems || []).reduce((itemSum: number, item: any) => {
        return itemSum + (item.price * item.quantity);
      }, 0);
    }, 0);
  }, 0);

  return `${waiter.name} ${waiter.surname}:
  - Requests: ${waiterRequests} total, ${waiterCompletedRequests} completed (${waiterRequests > 0 ? ((waiterCompletedRequests / waiterRequests) * 100).toFixed(1) : 0}%)
  - Orders: ${waiterOrders} total, ${waiterCompletedOrders} completed (${waiterOrders > 0 ? ((waiterCompletedOrders / waiterOrders) * 100).toFixed(1) : 0}%)
  - Revenue Generated: $${waiterRevenue.toFixed(2)}
  - Service Rating: ${waiterAvgRating.toFixed(2)}/5 (${waiterServiceAnalyses.length} ratings)
  - Chat Messages: ${waiterChatMessages}
  - Session Activities: ${waiterSessionActivities}`;
}).join('\n')}

RECENT SERVICE ANALYSIS INSIGHTS:
${rawData.serviceAnalyses.slice(0, 10).map((analysis: any, idx: number) => 
  `${idx + 1}. Waiter: ${analysis.waiter?.name}, Rating: ${analysis.rating}/5, Type: ${analysis.serviceType}, Comments: ${JSON.stringify(analysis.analysis).substring(0, 100)}...`
).join('\n')}

Please analyze this comprehensive data and provide insights on:
1. Individual waiter performance trends (up/down/stable based on completion rates, ratings, revenue contribution)
2. Team productivity and efficiency insights
3. Service quality assessment across all touchpoints
4. Revenue performance by staff member
5. Communication patterns and customer engagement
6. Overall operational effectiveness
7. Specific areas for improvement and growth opportunities

Respond in JSON format with structured insights that include specific metrics and actionable recommendations.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Today's date is: ${new Date().toISOString().split('T')[0]}. You are an expert restaurant analytics AI. Analyze staff performance data and provide actionable insights in JSON format.`
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "staff_performance_analysis",
              schema: {
                type: "object",
                properties: {
                  waiterTrends: {
                    type: "object",
                    additionalProperties: {
                      type: "object",
                      properties: {
                        weekTrend: { type: "string", enum: ["up", "down", "stable"] },
                        monthTrend: { type: "string", enum: ["up", "down", "stable"] },
                        reasoning: { type: "string" }
                      }
                    }
                  },
                  performanceGrowth: { type: "number" },
                  insights: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["waiterTrends", "performanceGrowth", "insights"]
              }
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices[0].message.content;
      
      let analysisResult;
      try {
        analysisResult = JSON.parse(content);
      } catch (parseError) {
        this.logger.error('Failed to parse structured AI response as JSON:', parseError);
        this.logger.error('Response content:', content);
        throw new Error('AI service returned invalid structured output');
      }

      return analysisResult;

    } catch (error) {
      this.logger.error('Failed to generate LLM staff analysis:', error);
      throw new Error('LLM analysis service is currently unavailable. Please try again later.');
    }
  }

  async getExecutiveSummaryAnalytics(dateRange?: DateRange, adminSessionId?: string, tenantId?: string): Promise<any> {
    // Check cache first if adminSessionId is provided
    if (adminSessionId) {
      const cacheKey = `getExecutiveSummaryAnalytics_${adminSessionId}_${JSON.stringify(dateRange)}_${tenantId || 'all'}`;
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.log(`Returning cached executive summary analytics for admin ${adminSessionId}`);
        return cachedResult;
      }
    }

    const { startDate, endDate } = dateRange || this.getDefaultDateRange(7);
    
    // Adjust endDate to include end-of-day timestamps for comprehensive data collection
    const adjustedEndDate = this.getEndDate(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);
    
    this.logger.log(`Fetching executive summary analytics from ${startDate} to ${adjustedEndDate} for tenant: ${tenantId || 'all'}`);

    try {
      let restaurantIds: string[] = [];
      if (tenantId) {
        // Get tenant's restaurants for filtering
        const tenantRestaurants = await this.prisma.restaurant.findMany({
          where: { tenantId },
          select: { id: true }
        });
        restaurantIds = tenantRestaurants.map(r => r.id);
        this.logger.log(`[TENANT FILTER] Found ${restaurantIds.length} restaurants for tenant ${tenantId}`);
      }

      // Build comprehensive filters for all data sources
      const baseTimeFilter = {
        gte: this.getStartDate(startDate),
        lte: adjustedEndDate
      };

      const sessionFilter: any = tenantId && restaurantIds.length > 0 ? 
        { restaurantId: { in: restaurantIds } } : {};

      // Fetch comprehensive data from all relevant tables with tenant filtering
      const [requests, requestsLog, serviceAnalysis, chatMessages, orders, orderLogs, userSessionLogs, userSessions] = await Promise.all([
        // Requests data with session-based tenant filtering
        this.prisma.request.findMany({
          where: {
            createdAt: baseTimeFilter,
            ...(tenantId && restaurantIds.length > 0 && {
              user: { restaurantId: { in: restaurantIds } }
            })
          },
          include: {
            user: {
              include: {
                waiter: true
              }
            },
            logs: true
          },
          orderBy: { createdAt: 'desc' }
        }),

        // Requests log data with session-based tenant filtering
        this.prisma.requestLog.findMany({
          where: {
            dateTime: baseTimeFilter,
            ...(tenantId && restaurantIds.length > 0 && {
              request: {
                user: { restaurantId: { in: restaurantIds } }
              }
            })
          },
          include: {
            request: {
              include: {
                user: {
                  include: {
                    waiter: true
                  }
                }
              }
            }
          },
          orderBy: { dateTime: 'desc' }
        }),

        // Service analysis data with session-based tenant filtering
        this.prisma.serviceAnalysis.findMany({
          where: {
            createdAt: baseTimeFilter,
            ...(tenantId && restaurantIds.length > 0 && {
              user: { restaurantId: { in: restaurantIds } }
            })
          },
          include: {
            user: {
              include: {
                waiter: true
              }
            },
            waiter: true
          },
          orderBy: { createdAt: 'desc' }
        }),

        // Chat messages data with session-based tenant filtering
        this.prisma.chatMessage.findMany({
          where: {
            createdAt: baseTimeFilter,
            ...(tenantId && restaurantIds.length > 0 && {
              user: { restaurantId: { in: restaurantIds } }
            })
          },
          include: {
            user: {
              include: {
                waiter: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),

        // Orders data with session-based tenant filtering
        this.prisma.order.findMany({
          where: {
            createdAt: baseTimeFilter,
            ...(tenantId && restaurantIds.length > 0 && {
              user: { restaurantId: { in: restaurantIds } }
            })
          },
          include: {
            orderItems: {
              include: {
                menuItem: true
              }
            },
            logs: true,
            user: {
              include: {
                waiter: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),

        // Order logs data
        this.prisma.orderLog.findMany({
          where: {
            dateTime: baseTimeFilter,
            ...(tenantId && restaurantIds.length > 0 && {
              order: {
                user: { restaurantId: { in: restaurantIds } }
              }
            })
          },
          include: {
            order: {
              include: {
                user: {
                  include: {
                    waiter: true
                  }
                }
              }
            }
          },
          orderBy: { dateTime: 'desc' }
        }),

        // User session logs for waiter activity tracking
        this.prisma.userSessionLog.findMany({
          where: {
            dateTime: baseTimeFilter,
            actorType: 'waiter'
          },
          orderBy: { dateTime: 'desc' }
        }),

        // User sessions for comprehensive session data
        this.prisma.user.findMany({
          where: {
            createdAt: baseTimeFilter,
            ...sessionFilter
          },
          include: {
            waiter: true,
            requests: {
              include: {
                logs: true
              }
            },
            orders: {
              include: {
                orderItems: {
                  include: {
                    menuItem: true
                  }
                },
                logs: true
              }
            },
            chatMessages: true,
            serviceAnalysis: true
          }
        })
      ]);

      this.logger.log(`[COMPREHENSIVE DATA] Collected: ${requests.length} requests, ${orders.length} orders, ${serviceAnalysis.length} service analyses, ${chatMessages.length} chat messages, ${userSessions.length} sessions, ${userSessionLogs.length} session logs`);

      // Log all returned requests in detail
      this.logger.log(`[DETAILED DATA] Total requests found: ${requests.length}`);
      requests.forEach((request, index) => {
        this.logger.log(`[REQUEST ${index + 1}] ID: ${request.id}, Status: ${request.status}, Created: ${request.createdAt}, User: ${request.userId}, Waiter: ${request.user?.waiter?.name || 'Unassigned'}, Content: ${request.content?.substring(0, 100) || 'No content'}...`);
      });
      // Calculate comprehensive metrics from all data sources
      const totalRequests = requests.length;
      const completedRequests = requests.filter(r => r.status === 'Done').length;
      const openRequests = requests.filter(r => r.status === 'New' || r.status === 'Acknowledged' || r.status === 'InProgress').length;
      const cancelledRequests = requests.filter(r => r.status === 'Cancelled').length;
      
      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === 'Paid').length;
      const openOrders = orders.filter(o => o.status === 'New' || o.status === 'Acknowledged' || o.status === 'InProgress').length;
      const cancelledOrders = orders.filter(o => o.status === 'Cancelled').length;
      const rejectedOrders = orders.filter(o => o.status === 'Rejected').length;
      const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;

      // Completion rates
      const requestCompletionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;
      const orderCompletionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      // Cancellation rates
      const requestCancelledRate = totalRequests > 0 ? (cancelledRequests / totalRequests) * 100 : 0;
      const orderCancelledRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

      // Rejection rates
      const orderRejectionRate = totalOrders > 0 ? (rejectedOrders / totalOrders) * 100 : 0;
      
      // Delivery rates
      const orderDeliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;      

      // Calculate overall user-to-waiter response time analysis
      // Group logs by request_id for analysis
      const logsByRequestId = new Map<string, any[]>();
      
      // Collect all logs for each request
      requestsLog.forEach(log => {
        if (!log.requestId) return;
        
        if (!logsByRequestId.has(log.requestId)) {
          logsByRequestId.set(log.requestId, []);
        }
        logsByRequestId.get(log.requestId)!.push(log);
      });

      this.logger.log(`[RESPONSE TIME ANALYSIS] Processing ${logsByRequestId.size} unique requests for overall response time calculation`);

      const requestAverages: number[] = [];

      // Process each request individually
      logsByRequestId.forEach((requestLogs, requestId) => {
        // Sort logs by dateTime to get proper sequence
        const sortedLogs = requestLogs.sort((a, b) => 
          new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
        );

        const responseTimes: number[] = [];
        let lastUserActionTime: Date | null = null;

        sortedLogs.forEach((log) => {
          const logTime = new Date(log.dateTime);
          
          if (log.actor === 'user') {
            // User action - update last user action time (overwrites if user acts multiple times)
            lastUserActionTime = logTime;
            
            this.logger.debug(`[REQ ${requestId}] User action at ${logTime.toISOString()}`);
          } 
          else if (log.actor === 'waiter' && lastUserActionTime) {
            // Waiter action - calculate response time from last user action
            const responseTime = logTime.getTime() - lastUserActionTime.getTime();
            const responseTimeMinutes = responseTime / (1000 * 60);
            
            responseTimes.push(responseTimeMinutes);
            
            this.logger.debug(`[REQ ${requestId}] Waiter responded in ${responseTimeMinutes.toFixed(2)} minutes`);
            
            // Reset for next cycle
            lastUserActionTime = null;
          }
        });

        // Calculate average response time for this request
        if (responseTimes.length > 0) {
          const avgResponseTimeForRequest = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
          requestAverages.push(avgResponseTimeForRequest);
          
          this.logger.debug(`[REQ ${requestId}] Average response time: ${avgResponseTimeForRequest.toFixed(2)} minutes from ${responseTimes.length} interactions`);
        }
      });

      // Calculate final average of all request averages
      const avgRequestResponseTime = requestAverages.length > 0 
        ? requestAverages.reduce((sum, avg) => sum + avg, 0) / requestAverages.length 
        : 0;

      this.logger.log(`[RESPONSE TIME ANALYSIS] Final overall average response time: ${avgRequestResponseTime.toFixed(2)} minutes from ${requestAverages.length} requests with valid interactions`);

      // Calculate overall user-to-waiter response time analysis for orders
      // Group order logs by order_id for analysis
      const orderLogsByOrderId = new Map<string, any[]>();
      
      // Collect all logs for each order
      orderLogs.forEach(log => {
        if (!log.orderId) return;
        
        if (!orderLogsByOrderId.has(log.orderId)) {
          orderLogsByOrderId.set(log.orderId, []);
        }
        orderLogsByOrderId.get(log.orderId)!.push(log);
      });

      this.logger.log(`[ORDER RESPONSE TIME ANALYSIS] Processing ${orderLogsByOrderId.size} unique orders for overall response time calculation`);

      const orderAverages: number[] = [];

      // Process each order individually
      orderLogsByOrderId.forEach((orderLogs, orderId) => {
        // Sort logs by dateTime to get proper sequence
        const sortedLogs = orderLogs.sort((a, b) => 
          new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
        );

        const responseTimes: number[] = [];
        let lastUserActionTime: Date | null = null;

        sortedLogs.forEach((log) => {
          const logTime = new Date(log.dateTime);
          
          if (log.actor === 'user') {
            // User action - update last user action time (overwrites if user acts multiple times)
            lastUserActionTime = logTime;
            
            this.logger.debug(`[ORDER ${orderId}] User action at ${logTime.toISOString()}`);
          } 
          else if (log.actor === 'waiter' && lastUserActionTime) {
            // Waiter action - calculate response time from last user action
            const responseTime = logTime.getTime() - lastUserActionTime.getTime();
            const responseTimeMinutes = responseTime / (1000 * 60);
            
            responseTimes.push(responseTimeMinutes);
            
            this.logger.debug(`[ORDER ${orderId}] Waiter responded in ${responseTimeMinutes.toFixed(2)} minutes`);
            
            // Reset for next cycle
            lastUserActionTime = null;
          }
        });

        // Calculate average response time for this order
        if (responseTimes.length > 0) {
          const avgResponseTimeForOrder = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
          orderAverages.push(avgResponseTimeForOrder);
          
          this.logger.debug(`[ORDER ${orderId}] Average response time: ${avgResponseTimeForOrder.toFixed(2)} minutes from ${responseTimes.length} interactions`);
        }
      });

      // Calculate final average of all order averages
      const avgOrderProcessingTime = orderAverages.length > 0 
        ? orderAverages.reduce((sum, avg) => sum + avg, 0) / orderAverages.length 
        : 0;

      this.logger.log(`[ORDER RESPONSE TIME ANALYSIS] Final overall average order response time: ${avgOrderProcessingTime.toFixed(2)} minutes from ${orderAverages.length} orders with valid interactions`);
      

      // Calculate service analysis insights
      const serviceInsights = serviceAnalysis.map(analysis => ({
        userId: analysis.userId,
        waiterId: analysis.waiterId,
        waiterName: analysis.waiter?.name,
        rating: analysis.rating,
        serviceType: analysis.serviceType,
        analysisData: analysis.analysis
      }));

      const avgServiceRating = serviceInsights.length > 0
        ? serviceInsights.reduce((sum, insight) => sum + insight.rating, 0) / serviceInsights.length
        : 0;
     

      // Prepare comprehensive data for LLM analysis
      const executiveDataForLLM = {
        dateRange: { startDate, endDate: adjustedEndDate },
        tenantFilter: tenantId ? `Applied (${restaurantIds.length} restaurants)` : 'None (all data)',
        requestMetrics: {
          totalRequests,
          completedRequests,
          openRequests,
          cancelledRequests,
          completionRate: Math.round(requestCompletionRate * 100) / 100,
          cancelledRate: Math.round(requestCancelledRate * 100) / 100
          
        },
        orderMetrics: {
          totalOrders,
          completedOrders,
          openOrders,
          cancelledOrders,
          completionRate: Math.round(orderCompletionRate * 100) / 100,
          cancelledRate: Math.round(orderCancelledRate * 100) / 100,
          avgProcessingTime: Math.round(avgOrderProcessingTime * 100) / 100,          
          rejectionRate: Math.round(orderRejectionRate * 100) / 100,
          deliveryRate: Math.round(orderDeliveryRate * 100) / 100,
        },
        avgServiceRating: Math.round(avgServiceRating * 100) / 100,
        serviceInsights: {
          totalAnalyses: serviceInsights.length,
          avgServiceRating,
          ratingDistribution: {
            excellent: serviceInsights.filter(s => s.rating >= 4).length,
            good: serviceInsights.filter(s => s.rating === 3).length,
            poor: serviceInsights.filter(s => s.rating <= 2).length
          }
        },
        sessionActivityMetrics: {
          totalSessionLogs: userSessionLogs.length,
          totalUserSessions: userSessions.length,
        },
      };

      // Generate LLM analysis
      const llmAnalysis = await this.generateExecutiveSummaryWithLLM(executiveDataForLLM);

      const result = {
        overview: {
          totalRequests,
          completedRequests,
          openRequests,
          totalOrders,
          completedOrders,
          requestCompletionRate: Math.round(requestCompletionRate * 100) / 100,
          orderCompletionRate: Math.round(orderCompletionRate * 100) / 100,
          requestCancelledRate: Math.round(requestCancelledRate * 100) / 100,
          orderCancelledRate: Math.round(orderCancelledRate * 100) / 100,
          averageRejectionRate: Math.round(orderRejectionRate * 100) / 100,
          averageDeliveryRate: Math.round(orderDeliveryRate * 100) / 100,
          avgRequestResponseTime: Math.round(avgRequestResponseTime * 100) / 100,
          avgOrderProcessingTime: Math.round(avgOrderProcessingTime * 100) / 100,
          avgServiceRating: Math.round(avgServiceRating * 100) / 100,
        },
        trends: {
          requestCompletionRate: requestCompletionRate > 80 ? 'up' : requestCompletionRate > 60 ? 'stable' : 'down',
          orderCompletionRate: orderCompletionRate > 80 ? 'up' : orderCompletionRate > 60 ? 'stable' : 'down',
          responseTime: avgRequestResponseTime < 10 ? 'up' : avgRequestResponseTime < 20 ? 'stable' : 'down',
          serviceRating: avgServiceRating > 4 ? 'up' : avgServiceRating > 3 ? 'stable' : 'down'
        },
        alerts: {
          openRequests: openRequests > 10,
          highCancelledRate: requestCancelledRate > 10,
          slowResponseTime: avgRequestResponseTime > 20,
          lowServiceRating: avgServiceRating < 3,
          highRejectionRate: orderRejectionRate > 10,
          lowDeliveryRate: orderDeliveryRate < 70,
        },       
        serviceQuality: {
          avgServiceRating,
          ratingDistribution: executiveDataForLLM.serviceInsights.ratingDistribution,
          totalAnalyses: serviceInsights.length
        },
        insights: llmAnalysis
      };

      // Cache the result if adminSessionId is provided
      if (adminSessionId) {
        const cacheKey = `getExecutiveSummaryAnalytics_${adminSessionId}_${JSON.stringify(dateRange)}`;
        this.cacheService.set(cacheKey, result);
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to fetch executive summary analytics:', error);
      throw new Error('Failed to load executive summary data');
    }
  }

  private async generateExecutiveSummaryWithLLM(data: any): Promise<any> {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('OpenAI API key not configured');
      throw new Error('LLM analysis service is currently unavailable.');
    }

    try {
      const prompt = `As a restaurant operations analyst, analyze this comprehensive executive summary data and provide strategic insights.

DATA SUMMARY:
Period: ${data.dateRange.startDate} to ${data.dateRange.endDate}
Tenant Filter: ${data.tenantFilter}

REQUEST METRICS:
- Total Requests: ${data.requestMetrics.totalRequests}
- Completed: ${data.requestMetrics.completedRequests}
- Open: ${data.requestMetrics.openRequests}
- Cancelled: ${data.requestMetrics.cancelledRequests}
- Completion Rate: ${data.requestMetrics.completionRate}%
- Cancelled Rate: ${data.requestMetrics.cancelledRate}%

ORDER METRICS:
- Total Orders: ${data.orderMetrics.totalOrders}
- Completed: ${data.orderMetrics.completedOrders}
- Open: ${data.orderMetrics.openOrders}
- Cancelled: ${data.orderMetrics.cancelledOrders}
- Completion Rate: ${data.orderMetrics.completionRate}%
- Cancelled Rate: ${data.orderMetrics.cancelledRate}%
- Rejection Rate: ${data.orderMetrics.rejectionRate}%
- Delivery Rate: ${data.orderMetrics.deliveryRate}%
- Average Processing Time: ${data.orderMetrics.avgProcessingTime} minutes

SERVICE QUALITY:
- Average Service Rating: ${data.avgServiceRating}/5
- Total Service Analyses: ${data.serviceInsights.totalAnalyses}
- Rating Distribution: ${data.serviceInsights.ratingDistribution.excellent} excellent, ${data.serviceInsights.ratingDistribution.good} good, ${data.serviceInsights.ratingDistribution.poor} poor

SESSION ACTIVITY METRICS:
- Total Session Logs: ${data.sessionActivityMetrics.totalSessionLogs}
- Total User Sessions: ${data.sessionActivityMetrics.totalUserSessions}

OPERATIONAL INSIGHTS:
Analyze the following comprehensive metrics to identify:
1. Service efficiency trends (completion vs cancellation vs rejection rates)
2. Quality patterns (service ratings distribution and processing times)
3. Operational bottlenecks (high rejection/cancellation rates)
4. Performance opportunities (session activity vs outcomes)

CRITICAL THRESHOLDS TO EVALUATE:
- Request completion rate below 80%
- Order rejection rate above 15%
- Service rating below 3.5/5
- High cancellation rates (>10%)
- Low delivery rate (<70%)

Please provide:
1. Executive summary (2-3 sentences focusing on overall operational health)
2. Key performance findings (3-5 bullet points highlighting critical metrics)
3. Strategic recommendations (3-5 actionable items addressing identified issues)
4. Critical alerts (any performance issues requiring immediate attention)

Format as JSON with keys: summary, keyFindings, recommendations, alerts`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Today's date is: ${new Date().toISOString().split('T')[0]}. You are an expert restaurant operations analyst. Provide strategic, actionable insights based on operational data.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1500,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "executive_summary",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Executive summary (2-3 sentences)"
                  },
                  keyFindings: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 5,
                    description: "Key performance findings (3-5 bullet points)"
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 5,
                    description: "Strategic recommendations (3-5 actionable items)"
                  },
                  alerts: {
                    type: "array",
                    items: { type: "string" },
                    description: "Critical alerts (if any performance issues detected)"
                  }
                },
                required: ["summary", "keyFindings", "recommendations", "alerts"],
                additionalProperties: false
              }
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AI error: ${response.statusText}`);
      }

      const result = await response.json();
      const analysisText = result.choices[0]?.message?.content;

      if (!analysisText) {
        throw new Error('No analysis content received from OpenAI');
      }

      // Parse JSON response from structured output
      let analysisResult;
      try {
        analysisResult = JSON.parse(analysisText);
      } catch (parseError) {
        this.logger.error('Failed to parse structured AI response as JSON:', parseError);
        this.logger.error('Response content:', analysisText);
        throw new Error('AI service returned invalid structured output');
      }

      return analysisResult;

    } catch (error) {
      this.logger.error('Failed to generate LLM executive summary:', error);
      throw new Error('LLM analysis service is currently unavailable. Please try again later.');
    }
  }

  async getAIInsights(dateRange?: DateRange, adminSessionId?: string, tenantId?: string): Promise<any> {
    // Check cache first if adminSessionId is provided
    if (adminSessionId) {
      const cacheKey = `getAIInsights_${adminSessionId}_${JSON.stringify(dateRange)}_${tenantId || 'all'}`;
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.log(`Returning cached AI insights for admin ${adminSessionId}`);
        return cachedResult;
      }
    }

    try {
      // Fetch the same data as staff performance and executive summary
      const staffData = await this.getStaffPerformanceAnalytics(dateRange, undefined, undefined, adminSessionId, tenantId);
      
      if (!staffData.overview || !staffData.staffRankings) {
        throw new Error('Unable to retrieve performance data for AI analysis');
      }

      // Fetch real sentiment data for analysis
      const startDate = dateRange?.startDate || subDays(new Date(), 30).toISOString();
      const endDate = dateRange?.endDate || new Date().toISOString();

      // Get service analysis data for sentiment analysis
      const serviceAnalysis = await this.prisma.serviceAnalysis.findMany({
        where: {
          createdAt: { 
            gte: this.getStartDate(startDate), 
            lte: this.getEndDate(endDate) 
          }
        },
        include: {
          user: {
            include: {
              waiter: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                  tag_nickname: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Get request logs for additional sentiment context
      const requestLogs = await this.prisma.requestLog.findMany({
        where: { 
          dateTime: { gte: this.getStartDate(startDate), lte: this.getEndDate(endDate) }
        },
        include: {
          request: {
            include: {
              user: {
                include: {
                  waiter: {
                    select: {
                      id: true,
                      name: true,
                      surname: true,
                      tag_nickname: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { dateTime: 'desc' }
      });

      // Get additional service analysis data for sentiment
      const additionalServiceAnalysis = await this.prisma.serviceAnalysis.findMany({
        where: {
          createdAt: {
            gte: this.getStartDate(startDate),
            lte: this.getEndDate(endDate)
          }
        },
        include: {
          waiter: {
            select: {
              id: true,
              name: true,
              surname: true,
              tag_nickname: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Prepare comprehensive data for LLM analysis including real sentiment data
      const analysisData = {
        overview: staffData.overview,
        staffRankings: staffData.staffRankings,
        sentimentData: {
          serviceAnalysis: serviceAnalysis.map(sa => ({
            rating: sa.rating,
            analysis: sa.analysis,
            serviceType: sa.serviceType,
            waiterName: sa.user.waiter ? `${sa.user.waiter.name} ${sa.user.waiter.surname}` : 'Unassigned',
            waiterId: sa.waiterId,
            createdAt: sa.createdAt
          })),
          requestLogs: requestLogs.slice(0, 50).map(log => ({
            action: log.action,
            dateTime: log.dateTime,
            waiterName: log.request.user.waiter ? `${log.request.user.waiter.name} ${log.request.user.waiter.surname}` : 'Unassigned',
            waiterId: log.request.user.waiterId,
            requestContent: log.request.content,
            requestStatus: log.request.status
          })),
          additionalServiceAnalysis: additionalServiceAnalysis.map(sa => ({
            waiterId: sa.waiterId,
            waiterName: `${sa.waiter.name} ${sa.waiter.surname}`,
            rating: sa.rating,
            analysis: sa.analysis,
            serviceType: sa.serviceType,
            createdAt: sa.createdAt
          })),
          totalServiceAnalysis: serviceAnalysis.length,
          totalRequestLogs: requestLogs.length,
          totalAdditionalServiceAnalysis: additionalServiceAnalysis.length
        },
        dateRange: dateRange,
        timestamp: new Date().toISOString()
      };

      // Create prompt for AI insights analysis with real sentiment data
      const prompt = `
Analyze the following restaurant operational data and provide specific insights for these four categories:

1. EXCEPTIONAL PERFORMANCE ANALYSIS
2. RESPONSE TIMES DURING PEAK ANALYSIS  
3. CUSTOMER SENTIMENT IMPROVEMENT POTENTIAL ANALYSIS
4. COMMUNICATION GAPS IN TABLE SERVICE ANALYSIS

OPERATIONAL DATA:
${JSON.stringify(analysisData, null, 2)}

IMPORTANT: Use the real sentiment data provided (serviceAnalysis, requestLogs) to generate accurate sentiment analysis.

Please respond with a JSON object containing:
{
  "insights": [
    {
      "id": "unique_id",
      "type": "positive|negative|warning|opportunity", 
      "title": "Brief insight title",
      "description": "Detailed description based on actual data",
      "confidence": number (1-100),
      "impact": "high|medium|low",
      "category": "performance|sentiment|efficiency|quality",
      "recommendation": "Specific actionable recommendation",
      "dataPoints": ["relevant", "data", "points"]
    }
  ],
  "sentiment": {
    "overall": {
      "positive": number (percentage based on actual ratings/feedback),
      "neutral": number (percentage),
      "negative": number (percentage),
      "trend": "improving|declining|stable" (based on data trends)
    },
    "byWaiter": [
      {
        "waiterId": "actual_waiter_id",
        "waiterName": "actual_waiter_name",
        "sentiment": number (0-100 based on actual ratings),
        "trend": "up|down|stable",
        "keyWords": ["actual", "feedback", "words"],
        "keyFindings": ["specific", "insights", "from", "data"]
      }
    ],
    "themes": [
      {
        "theme": "actual theme from feedback",
        "frequency": number (actual count),
        "sentiment": number (0-100),
        "examples": ["actual", "feedback", "examples"]
      }
    ]
  },
  "performance": {
    "patterns": [
      {
        "pattern": "Pattern name based on actual data",
        "description": "Pattern description from real data", 
        "frequency": number (based on actual occurrences),
        "impact": "High|Medium|Low"
      }
    ],
    "anomalies": [
      {
        "type": "Anomaly type from data",
        "description": "Anomaly description based on real patterns",
        "severity": "high|medium|low",
        "affectedStaff": ["actual", "staff", "names"]
      }
    ],
    "predictions": [
      {
        "metric": "Metric name",
        "currentValue": number (from actual data),
        "predictedValue": number (realistic prediction),
        "confidence": number,
        "timeframe": "timeframe"
      }
    ]
  }
Focus on data-driven insights using the actual sentiment data provided. Calculate real percentages for sentiment distribution, use actual waiter names and ratings, and extract real themes from the feedback data.`;

      // Check if OpenAI API is available
      if (!process.env.OPENAI_API_KEY) {
        this.logger.warn('OpenAI API key not configured, returning empty insights');
        return {
          insights: [],
          sentiment: null,
          performance: null,
          metadata: {
            generatedAt: new Date().toISOString(),
            dataRange: dateRange,
            llmAvailable: false,
            error: 'AI insights service not configured'
          }
        };
      }

      // Call OpenAI API with structured output
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Today's date is: ${new Date().toISOString().split('T')[0]}. You are an expert restaurant operations analyst specializing in performance optimization, customer sentiment analysis, and operational efficiency. Provide data-driven insights with specific recommendations based on real operational metrics.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ai_insights_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        type: { type: "string", enum: ["positive", "negative", "warning", "opportunity"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        confidence: { type: "number", minimum: 1, maximum: 100 },
                        impact: { type: "string", enum: ["high", "medium", "low"] },
                        category: { type: "string", enum: ["performance", "sentiment", "efficiency", "quality"] },
                        recommendation: { type: "string" },
                        dataPoints: { type: "array", items: { type: "string" } }
                      },
                      required: ["id", "type", "title", "description", "confidence", "impact", "category", "recommendation", "dataPoints"],
                      additionalProperties: false
                    }
                  },
                  sentiment: {
                    type: "object",
                    properties: {
                      overall: {
                        type: "object",
                        properties: {
                          positive: { type: "number" },
                          neutral: { type: "number" },
                          negative: { type: "number" },
                          trend: { type: "string", enum: ["improving", "declining", "stable"] }
                        },
                        required: ["positive", "neutral", "negative", "trend"],
                        additionalProperties: false
                      },
                      byWaiter: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            waiterId: { type: "string" },
                            waiterName: { type: "string" },
                            sentiment: { type: "number", minimum: 0, maximum: 100 },
                            trend: { type: "string", enum: ["up", "down", "stable"] },
                            keyWords: { type: "array", items: { type: "string" } },
                            keyFindings: { type: "array", items: { type: "string" } }
                          },
                          required: ["waiterId", "waiterName", "sentiment", "trend", "keyWords", "keyFindings"],
                          additionalProperties: false
                        }
                      },
                      themes: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            theme: { type: "string" },
                            frequency: { type: "number" },
                            sentiment: { type: "number", minimum: 0, maximum: 100 },
                            examples: { type: "array", items: { type: "string" } }
                          },
                          required: ["theme", "frequency", "sentiment", "examples"],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ["overall", "byWaiter", "themes"],
                    additionalProperties: false
                  },
                  performance: {
                    type: "object",
                    properties: {
                      patterns: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            pattern: { type: "string" },
                            description: { type: "string" },
                            frequency: { type: "number" },
                            impact: { type: "string", enum: ["High", "Medium", "Low"] }
                          },
                          required: ["pattern", "description", "frequency", "impact"],
                          additionalProperties: false
                        }
                      },
                      anomalies: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            type: { type: "string" },
                            description: { type: "string" },
                            severity: { type: "string", enum: ["high", "medium", "low"] },
                            affectedStaff: { type: "array", items: { type: "string" } }
                          },
                          required: ["type", "description", "severity", "affectedStaff"],
                          additionalProperties: false
                        }
                      },
                      predictions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            metric: { type: "string" },
                            currentValue: { type: "number" },
                            predictedValue: { type: "number" },
                            confidence: { type: "number" },
                            timeframe: { type: "string" }
                          },
                          required: ["metric", "currentValue", "predictedValue", "confidence", "timeframe"],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ["patterns", "anomalies", "predictions"],
                    additionalProperties: false
                  }
                },
                required: ["insights", "sentiment", "performance"],
                additionalProperties: false
              }
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices[0].message.content;

      // Parse structured output response
      let aiInsights;
      try {
        // With structured output, the content should be valid JSON
        aiInsights = JSON.parse(content);
      } catch (parseError) {
        this.logger.error('Failed to parse structured AI response as JSON:', parseError);
        this.logger.error('Response content:', content);
        throw new Error('AI service returned invalid structured output');
      }

      const result = {
        insights: aiInsights.insights || [],
        sentiment: aiInsights.sentiment || null,
        performance: aiInsights.performance || null,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataRange: dateRange,
          llmAvailable: true
        }
      };

      // Cache the result if adminSessionId is provided
      if (adminSessionId) {
        const cacheKey = `getAIInsights_${adminSessionId}_${JSON.stringify(dateRange)}_${tenantId || 'all'}`;
        this.cacheService.set(cacheKey, result);
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to generate AI insights:', error);
      
      // Return fallback structure if LLM fails
      return {
        insights: [],
        sentiment: null,
        performance: null,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataRange: dateRange,
          llmAvailable: false,
          error: 'AI insights service temporarily unavailable'
        }
      };
    }
  }

  /**
   * Reconstruct session timeline to determine waiter responsibility periods
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
        // If no logs, check if the user exists for this session and assume responsibility from session start
        const user = await this.prisma.user.findFirst({
          where: { sessionId: sessionId },
          select: { waiterId: true, createdAt: true }
        });
        
        if (user && user.waiterId) {
          return [{
            waiterId: user.waiterId,
            startTime: user.createdAt,
            endTime: endDate, // Assume responsibility until end of analysis period
            duration: endDate.getTime() - user.createdAt.getTime()
          }];
        }
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

      // If there's an ongoing period at the end of the analysis window
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
      this.logger.error(`Failed to reconstruct session timeline for ${sessionId}: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Find which waiter was responsible for a session at a specific time
   * @param sessionId The session ID
   * @param eventTime The time of the event
   * @param sessionTimelines All session timelines for the analysis period
   * @returns The waiter ID who was responsible at that time, or null if none
   */
  private findResponsibleWaiterAtTime(sessionId: string, eventTime: Date, sessionTimelines: any[][]): string | null {
    // Find the timeline for this specific session
    const sessionTimeline = sessionTimelines.find(timeline => 
      timeline.length > 0 && timeline.some(period => period.sessionId === sessionId)
    );
    
    if (!sessionTimeline) {
      // No timeline found
      return null;
    }

    // Check which waiter was responsible at the event time
    for (const period of sessionTimeline) {
      if (eventTime >= period.startTime && eventTime <= period.endTime) {
        return period.waiterId;
      }
    }
    
    return null;
  }

  /**
   * Check if a waiter was responsible for a session at a specific time
   * @param waiterId The waiter ID to check
   * @param sessionId The session ID
   * @param eventTime The time of the event (request/order creation)
   * @param sessionTimelines All session timelines for the analysis period
   * @returns True if the waiter was responsible at that time
   */
  private isWaiterResponsibleAtTime(waiterId: string, sessionId: string, eventTime: Date, sessionTimelines: any[][]): boolean {
    // Find the timeline for this specific session
    const sessionTimelineIndex = sessionTimelines.findIndex(timeline => 
      timeline.length > 0 && timeline[0].sessionId === sessionId
    );
    
    if (sessionTimelineIndex === -1) {
      // No timeline found, use fallback logic
      return true; // Conservative approach - assume responsibility
    }

    const sessionTimeline = sessionTimelines[sessionTimelineIndex];
    
    // Check if the waiter was responsible at the event time
    for (const period of sessionTimeline) {
      if (period.waiterId === waiterId && 
          eventTime >= period.startTime && 
          eventTime <= period.endTime) {
        return true;
      }
    }
    
    return false;
  }
}
