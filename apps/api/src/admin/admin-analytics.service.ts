import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CacheService } from '../common/cache.service';
import { Prisma, Review, Shift, Waiter, OrderStatus, RequestStatus as PrismaRequestStatus, Order, OrderItem, MenuItem, Request as PrismaRequestType, RequestLog, ServiceAnalysis } from '@prisma/client';
import {
  SalesAnalyticsData,
  PopularItemsAnalyticsData,
  ShiftsAnalyticsData,
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
  ShiftSalesDataPoint,
  ShiftAverageOrderValueDataPoint,
  ShiftPerformanceDetail,
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
  WaiterRatingsBreakdown,
  WaiterRatingsAnalyticsData,
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
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, days - 1));
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  private getCurrentMonthDateRange(): DateRange {
    const now = new Date();
    return {
      startDate: startOfMonth(now).toISOString(),
      endDate: endOfDay(now).toISOString(), 
    };
  }

  private getTodayDateRange(): DateRange {
    const now = new Date();
    return {
      startDate: startOfDay(now).toISOString(),
      endDate: endOfDay(now).toISOString(),
    };
  }

  async getSalesAnalytics(dateRange?: DateRange): Promise<SalesAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(30);
    this.logger.log(`Fetching sales analytics from ${startDate} to ${endDate}`);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } },
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
      where: { order: { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } } },
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

  async getShiftsAnalytics(dateRange?: DateRange): Promise<ShiftsAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(7);
    this.logger.log(`Fetching shifts analytics from ${startDate} to ${endDate}`);

    const shifts = await this.prisma.shift.findMany({
      where: {
        AND: [
          { startTime: { lte: new Date(endDate) } },
          { endTime: { gte: new Date(startDate) } },
        ],
      },
      orderBy: { startTime: 'asc' },
    });

    const salesByShift: ShiftSalesDataPoint[] = [];
    const averageOrderValueByShift: ShiftAverageOrderValueDataPoint[] = [];
    const shiftPerformanceDetails: ShiftPerformanceDetail[] = [];

    for (const shift of shifts) {
      const ordersInShift = await this.prisma.order.findMany({
        where: { createdAt: { gte: shift.startTime, lte: shift.endTime } },
        include: { orderItems: true },
      });
      let shiftTotalSales = 0;
      ordersInShift.forEach(order => {
        order.orderItems.forEach(item => {
            shiftTotalSales += item.price.toNumber() * item.quantity;
        });
      });
      const totalOrders = ordersInShift.length;
      const averageOrderValue = totalOrders > 0 ? shiftTotalSales / totalOrders : 0;
      const shiftLabel = `${format(shift.date, 'yyyy-MM-dd')} (${format(shift.startTime, 'HH:mm')}-${format(shift.endTime, 'HH:mm')})`;

      salesByShift.push({ name: shiftLabel, value: parseFloat(shiftTotalSales.toFixed(2)) });
      averageOrderValueByShift.push({ name: shiftLabel, value: parseFloat(averageOrderValue.toFixed(2)) });
      shiftPerformanceDetails.push({
        shiftId: shift.id,
        shiftLabel,
        date: format(shift.date, 'yyyy-MM-dd'),
        totalSales: parseFloat(shiftTotalSales.toFixed(2)),
        totalOrders,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      });
    }
    return { salesByShift, averageOrderValueByShift, shiftPerformanceDetails };
  }

  async getHourlySalesAnalytics(dateRange?: DateRange): Promise<HourlySalesAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getTodayDateRange(); 
    this.logger.log(`Fetching hourly sales analytics from ${startDate} to ${endDate}`);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } },
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

  async getStaffAnalytics(dateRange?: DateRange): Promise<StaffAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(30);
    this.logger.log(`Fetching staff analytics from ${startDate} to ${endDate}`);
    
    const waiters = await this.prisma.waiter.findMany({ 
        include: { 
            accessAccount: { select: { userType: true }}, 
            ratings: { where: { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } } },
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
        
        // Get all user sessions for this waiter
        const waiterSessions = await this.prisma.user.findMany({
            where: { 
                waiterId: waiter.id,
                createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
            },
            select: { id: true, tableNumber: true }
        });
        
        const sessionIds = waiterSessions.map(session => session.id);
        
        // Get orders from these sessions
        const ordersFromSessions = await this.prisma.order.findMany({
            where: {
                userId: { in: sessionIds },
                createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
            },
            include: { orderItems: true }
        });
        
        // Calculate totals from orders
        ordersFromSessions.forEach(order => {
            let orderValue = 0;
            let orderItemCount = 0;
            order.orderItems.forEach(item => {
                orderValue += item.price.toNumber() * item.quantity;
                orderItemCount += item.quantity;
            });
            totalSales += orderValue;
            itemsSoldCount += orderItemCount;
            totalOrders += 1;
        });

        salesPerformance.push({
            staffId: waiter.id,
            staffName,
            totalSales: parseFloat(totalSales.toFixed(2)),
            totalOrders,
            averageOrderValue: totalOrders > 0 ? parseFloat((totalSales / totalOrders).toFixed(2)) : 0,
            itemsSold: itemsSoldCount
        });
        orderCounts.push({ name: staffName, value: totalOrders });
        
        const avgRating = waiter.ratings.length > 0 
            ? waiter.ratings.reduce((sum, r) => sum + (r.friendliness + r.orderAccuracy + r.speed + r.attentiveness + r.knowledge) / 5, 0) / waiter.ratings.length
            : 0;

        // Get requests handled by this waiter based on sessions they were involved in
        const requestsHandled = await this.prisma.request.count({
            where: { 
                userId: { in: sessionIds },
                createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
            }
        });

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
        ratings: { where: { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } } },
      }
    });

    if (!waiter) {
      throw new Error(`Staff member with ID ${staffId} not found`);
    }

    // Get all user sessions for this waiter
    const waiterSessions = await this.prisma.user.findMany({
      where: { 
        waiterId: waiter.id,
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
      },
      select: { sessionId: true, createdAt: true }
    });

    const sessionIds = waiterSessions.map(session => session.sessionId);

    // Get requests performance data
    const requests = await this.prisma.request.findMany({
      where: { 
        sessionId: { in: sessionIds },
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
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
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
      },
      select: { rating: true, createdAt: true }
    });

    // Get orders performance data
    const orders = await this.prisma.order.findMany({
      where: { 
        sessionId: { in: sessionIds },
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
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
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
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
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
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
          gte: new Date(startDate),
          lte: new Date(endDate),
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
      const itemWithRating = item as any;
      return `Review ${index + 1} (Table ${item.user?.tableNumber || 'Unknown'}, Type: ${item.serviceType || 'unknown'}):
- Happiness Level: ${analysis.happiness} (Rating: ${itemWithRating.rating || 3}/5)
- What customer said: "${analysis.reason}"
- Suggested improvement: "${analysis.suggested_improvement}"
- Overall sentiment: ${analysis.overall_sentiment}
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
      // Use the same AI service that the waiter endpoint uses
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
              content: 'You are an expert restaurant manager analyzing waiter performance. Always respond with valid JSON only, no additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
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
      const happinessCounts = serviceAnalysisData.reduce((acc: any, item: any) => {
        const analysis = item.analysis as any;
        const happiness = analysis.happiness || 'Unknown';
        acc[happiness] = (acc[happiness] || 0) + 1;
        return acc;
      }, {});

      const avgRating = serviceAnalysisData.reduce((sum, item: any) => sum + (item.rating || 3), 0) / serviceAnalysisData.length;

      return {
        overall_sentiment: avgRating >= 4 ? 'Good' : avgRating >= 3 ? 'Satisfactory' : 'Needs Improvement',
        happiness_breakdown: happinessCounts,
        improvement_points: ['AI analysis temporarily unavailable', 'Please review individual feedback for insights'],
        strengths: ['Manual review recommended'],
        overall_analysis: `Based on ${serviceAnalysisData.length} feedback entries with an average rating of ${avgRating.toFixed(1)}/5. AI analysis is temporarily unavailable.`,
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
      where: { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } },
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

  async getWaiterRatingsAnalyticsFromServiceAnalysis(dateRange?: DateRange): Promise<WaiterRatingsAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(30);
    this.logger.log(`Fetching waiter ratings analytics from service analysis from ${startDate} to ${endDate}`);

    try {
      // Get all waiters
      const waiters = await this.prisma.waiter.findMany({
        select: {
          id: true,
          name: true,
          surname: true,
          tag_nickname: true,
        }
      });

      // Get all service analysis data for the period
      const serviceAnalyses = await this.prisma.serviceAnalysis.findMany({
        where: {
          createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
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
      const ratingsBreakdownPerWaiter: WaiterRatingsBreakdown[] = waiters.map(waiter => {
        const waiterAnalyses = serviceAnalyses.filter(sa => sa.waiterId === waiter.id);
        const avgRating = waiterAnalyses.length > 0 
          ? waiterAnalyses.reduce((sum, sa) => sum + sa.rating, 0) / waiterAnalyses.length
          : 0;
        
        return {
          waiterId: waiter.id,
          waiterName: `${waiter.name} ${waiter.surname} (${waiter.tag_nickname})`,
          averageFriendliness: parseFloat(avgRating.toFixed(1)),
          averageOrderAccuracy: parseFloat(avgRating.toFixed(1)),
          averageSpeed: parseFloat(avgRating.toFixed(1)),
          averageAttentiveness: parseFloat(avgRating.toFixed(1)),
          averageKnowledge: parseFloat(avgRating.toFixed(1)),
          totalRatings: waiterAnalyses.length,
        };
      });

      return {
        averageRatingsPerWaiter,
        overallRatingDistribution,
        ratingsTrend,
        recentComments,
        ratingsBreakdownPerWaiter
      };

    } catch (error) {
      this.logger.error('Failed to fetch waiter ratings analytics from service analysis:', error);
      throw new Error('Failed to load waiter ratings analytics');
    }
  }

  async getRequestsAnalytics(dateRange?: DateRange): Promise<RequestsAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(7);
    this.logger.log(`Fetching requests analytics from ${startDate} to ${endDate}`);

    // Fetch all requests within the date range with their logs
    const requests = await this.prisma.request.findMany({
      where: { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } },
      include: { 
        logs: { orderBy: { dateTime: 'asc' } },
        user: { include: { waiter: true } }
      },
    });

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
      where: { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } },
    });
    const statusDistribution: RequestStatusDistribution[] = statusCounts.map(s => ({ 
      name: s.status.toString(), 
      value: s._count.id 
    }));

    // Requests over time
    const requestsOverTimeMap = new Map<string, { newRequests: number; resolvedRequests: number }>();
    eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) }).forEach(day => {
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

  async getCustomerRatingsAnalytics(dateRange?: DateRange, adminSessionId?: string): Promise<CustomerRatingsAnalyticsData> {
    const methodStartTime = Date.now();
    this.logger.log(`[CACHE] Starting getCustomerRatingsAnalytics for admin: ${adminSessionId || 'unknown'}, dateRange: ${JSON.stringify(dateRange)}`);
    
    // Check cache first if adminSessionId is provided
    if (adminSessionId) {
      const cacheKey = `getCustomerRatingsAnalytics_${adminSessionId}_${JSON.stringify(dateRange)}`;
      this.logger.log(`[CACHE] Checking cache with key: ${cacheKey}`);
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        const cacheTime = Date.now() - methodStartTime;
        this.logger.log(`[CACHE HIT] ✅ Returning cached customer ratings analytics for admin ${adminSessionId} in ${cacheTime}ms - NO LLM CALL MADE`);
        return cachedResult;
      } else {
        this.logger.log(`[CACHE MISS] ❌ No cached data found for admin ${adminSessionId} - will fetch fresh data and call LLM`);
      }
    } else {
      this.logger.log(`[CACHE] No admin user ID provided - skipping cache check`);
    }

    const { startDate, endDate } = dateRange || this.getDefaultDateRange(30);
    this.logger.log(`[DATA FETCH] Fetching overall sentiments analytics from ${startDate} to ${endDate}`);

    try {
      // Fetch request logs for request resolution analysis
      const requestLogs = await this.prisma.requestLog.findMany({
        where: { 
          dateTime: { gte: new Date(startDate), lte: new Date(endDate) }
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

    // Fetch service analysis data for request-type feedback
    const serviceAnalysis = await this.prisma.serviceAnalysis.findMany({
      where: {
        serviceType: 'request',
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
      },
      include: {
        user: {
          include: {
            waiter: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

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

    // Cache the result if adminSessionId is provided
    if (adminSessionId) {
      const cacheKey = `getCustomerRatingsAnalytics_${adminSessionId}_${JSON.stringify(dateRange)}`;
      this.cacheService.set(cacheKey, result);
      const totalTime = Date.now() - methodStartTime;
      this.logger.log(`[CACHE STORE] 💾 Cached customer ratings analytics for admin ${adminSessionId} (total method time: ${totalTime}ms)`);
    } else {
      const totalTime = Date.now() - methodStartTime;
      this.logger.log(`[NO CACHE] Result not cached (no admin user ID) - total method time: ${totalTime}ms`);
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
              content: 'You are an expert restaurant analytics consultant specializing in service quality and operational efficiency analysis. Provide actionable insights based on request handling and service feedback data.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
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
        this.logger.warn('Failed to parse AI response as JSON, attempting to clean content:', content);
        // Try to extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[1]);
        } else {
          throw parseError;
        }
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
    adminSessionId?: string
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

      // Get all waiters
      const waiters = await this.prisma.waiter.findMany({
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
      const rawAnalysisData = await this.gatherRawStaffDataForLLM(waiters, startDate, endDate, waiterId);
      
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
  private async gatherRawStaffDataForLLM(waiters: any[], startDate: Date, endDate: Date, waiterId?: string) {
    const waiterIds = waiterId && waiterId !== 'all' ? [waiterId] : waiters.map(w => w.id);

    // Get all user sessions assigned to these waiters
    const userSessions = await this.prisma.user.findMany({
      where: {
        waiterId: { in: waiterIds },
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        requests: {
          include: {
            logs: { orderBy: { dateTime: 'asc' } }
          }
        },
        chatMessages: true,
        serviceAnalysis: true,
      }
    });

    // Get service analysis instead of waiter ratings
    const serviceAnalyses = await this.prisma.serviceAnalysis.findMany({
      where: {
        waiterId: { in: waiterIds },
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        user: true,
        waiter: true,
      }
    });

    return {
      waiters,
      userSessions,
      serviceAnalyses,
      dateRange: { startDate, endDate }
    };
  }

  /**
   * Use LLM to analyze raw staff data and generate insights
   */
  private async generateLLMStaffAnalysis(rawData: any): Promise<any> {
    try {
      const totalRequests = rawData.userSessions.reduce((sum: number, session: any) => sum + session.requests.length, 0);
      const totalCompletedRequests = rawData.userSessions.reduce((sum: number, session: any) => 
        sum + session.requests.filter((r: any) => r.status === 'Completed' || r.status === 'Done').length, 0);
      const totalRatings = rawData.serviceAnalyses.length;
      const avgRating = totalRatings > 0 ? 
        rawData.serviceAnalyses.reduce((sum: number, r: any) => sum + r.rating, 0) / totalRatings : 0;

      const analysisPrompt = `Analyze the following restaurant staff performance data and provide insights:

STAFF DATA SUMMARY:
- Total Waiters: ${rawData.waiters.length}
- Total Requests: ${totalRequests}
- Completed Requests: ${totalCompletedRequests}
- Completion Rate: ${totalRequests > 0 ? ((totalCompletedRequests / totalRequests) * 100).toFixed(1) : 0}%
- Total Ratings: ${totalRatings}
- Average Rating: ${avgRating.toFixed(2)}/5.0

DETAILED WAITER DATA:
${rawData.waiters.map((waiter: any) => {
  const waiterSessions = rawData.userSessions.filter((s: any) => s.waiterId === waiter.id);
  const waiterRequests = waiterSessions.reduce((sum: number, s: any) => sum + s.requests.length, 0);
  const waiterCompleted = waiterSessions.reduce((sum: number, s: any) => 
    sum + s.requests.filter((r: any) => r.status === 'Completed' || r.status === 'Done').length, 0);
  const waiterServiceAnalyses = rawData.serviceAnalyses.filter((r: any) => r.waiterId === waiter.id);
  const waiterAvgRating = waiterServiceAnalyses.length > 0 ? 
    waiterServiceAnalyses.reduce((sum: number, r: any) => sum + r.rating, 0) / waiterServiceAnalyses.length : 0;

  return `${waiter.name} ${waiter.surname}: ${waiterRequests} requests, ${waiterCompleted} completed (${waiterRequests > 0 ? ((waiterCompleted / waiterRequests) * 100).toFixed(1) : 0}%), Rating: ${waiterAvgRating.toFixed(2)}/5.0`;
}).join('\n')}

Please analyze this data and provide insights on:
1. Performance trends for each waiter (up/down/stable based on completion rates and ratings)
2. Team productivity insights
3. Service quality assessment
4. Overall performance growth assessment

Respond in JSON format with structured insights.`;

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
              content: 'You are an expert restaurant analytics AI. Analyze staff performance data and provide actionable insights in JSON format.'
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
        this.logger.warn('Failed to parse AI response as JSON, attempting to clean content:', content);
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[1]);
        } else {
          throw parseError;
        }
      }

      return analysisResult;

    } catch (error) {
      this.logger.error('Failed to generate LLM staff analysis:', error);
      throw new Error('LLM analysis service is currently unavailable. Please try again later.');
    }
  }

  async getExecutiveSummaryAnalytics(dateRange?: DateRange, adminSessionId?: string): Promise<any> {
    // Check cache first if adminSessionId is provided
    if (adminSessionId) {
      const cacheKey = `getExecutiveSummaryAnalytics_${adminSessionId}_${JSON.stringify(dateRange)}`;
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.log(`Returning cached executive summary analytics for admin ${adminSessionId}`);
        return cachedResult;
      }
    }

    const { startDate, endDate } = dateRange || this.getDefaultDateRange(7);
    this.logger.log(`Fetching executive summary analytics from ${startDate} to ${endDate}`);

    try {
      // Fetch data from the specified tables: requests, requests_log, service_analysis, chat_messages
      const [requests, requestsLog, serviceAnalysis, chatMessages] = await Promise.all([
        // Requests data
        this.prisma.request.findMany({
          where: {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
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

        // Requests log data
        this.prisma.requestLog.findMany({
          where: {
            dateTime: {
              gte: new Date(startDate),
              lte: new Date(endDate)
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
          orderBy: { dateTime: 'desc' }
        }),

        // Service analysis data
        this.prisma.serviceAnalysis.findMany({
          where: {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          },
          include: {
            user: true,
            waiter: true
          },
          orderBy: { createdAt: 'desc' }
        }),

        // Chat messages data
        this.prisma.chatMessage.findMany({
          where: {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          },
          include: {
            user: {
              include: {
                waiter: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      // Calculate basic metrics from the fetched data
      const totalRequests = requests.length;
      const completedRequests = requests.filter(r => r.status === 'Completed').length;
      const openRequests = requests.filter(r => r.status === 'New' || r.status === 'Acknowledged' || r.status === 'InProgress').length;
      const cancelledRequests = requests.filter(r => r.status === 'Cancelled').length;
      
      const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;
      const cancelledRate = totalRequests > 0 ? (cancelledRequests / totalRequests) * 100 : 0;

      // Calculate average response time from requests_log
      const responseTimeLogs = requestsLog.filter(log => 
        log.action.includes('status_change') && log.request?.status === 'Completed'
      );
      
      const avgResponseTime = responseTimeLogs.length > 0 
        ? responseTimeLogs.reduce((sum, log) => {
            const responseTime = new Date(log.dateTime).getTime() - new Date(log.request.createdAt).getTime();
            return sum + (responseTime / (1000 * 60)); // Convert to minutes
          }, 0) / responseTimeLogs.length
        : 0;

      // Get waiter performance metrics
      const waiterStats = new Map();
      requests.forEach(request => {
        const waiter = request.user?.waiter;
        if (waiter) {
          const waiterId = waiter.id;
          if (!waiterStats.has(waiterId)) {
            waiterStats.set(waiterId, {
              name: waiter.name,
              totalRequests: 0,
              completedRequests: 0,
              responseTime: 0,
              responseCount: 0
            });
          }
          
          const stats = waiterStats.get(waiterId);
          stats.totalRequests++;
          if (request.status === 'Completed') {
            stats.completedRequests++;
          }
        }
      });

      // Calculate response times per waiter from logs
      requestsLog.forEach(log => {
        const waiter = log.request?.user?.waiter;
        if (waiter && log.action.includes('status_change')) {
          const waiterId = waiter.id;
          const stats = waiterStats.get(waiterId);
          if (stats) {
            const responseTime = new Date(log.dateTime).getTime() - new Date(log.request.createdAt).getTime();
            stats.responseTime += (responseTime / (1000 * 60));
            stats.responseCount++;
          }
        }
      });

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

      // Analyze chat messages for communication patterns
      const chatStats = {
        totalMessages: chatMessages.length,
        waiterMessages: chatMessages.filter(msg => msg.user?.waiter).length,
        avgMessagesPerRequest: totalRequests > 0 ? chatMessages.length / totalRequests : 0,
        messagesByWaiter: new Map()
      };

      // Group chat messages by waiter
      chatMessages.forEach(msg => {
        const waiter = msg.user?.waiter;
        if (waiter) {
          const waiterId = waiter.id;
          if (!chatStats.messagesByWaiter.has(waiterId)) {
            chatStats.messagesByWaiter.set(waiterId, {
              name: waiter.name,
              messageCount: 0
            });
          }
          chatStats.messagesByWaiter.get(waiterId).messageCount++;
        }
      });

      // Prepare data for LLM analysis
      const executiveDataForLLM = {
        dateRange: { startDate, endDate },
        totalRequests,
        completedRequests,
        openRequests,
        cancelledRequests,
        completionRate: Math.round(completionRate * 100) / 100,
        cancelledRate: Math.round(cancelledRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        avgServiceRating: Math.round(avgServiceRating * 100) / 100,
        waiterPerformance: Array.from(waiterStats.entries()).map(([waiterId, stats]) => ({
          waiterId,
          name: stats.name,
          totalRequests: stats.totalRequests,
          completedRequests: stats.completedRequests,
          completionRate: stats.totalRequests > 0 ? Math.round((stats.completedRequests / stats.totalRequests) * 10000) / 100 : 0,
          avgResponseTime: stats.responseCount > 0 ? Math.round((stats.responseTime / stats.responseCount) * 100) / 100 : 0
        })),
        serviceInsights: {
          totalAnalyses: serviceInsights.length,
          avgServiceRating,
          ratingDistribution: {
            excellent: serviceInsights.filter(s => s.rating >= 4).length,
            good: serviceInsights.filter(s => s.rating === 3).length,
            poor: serviceInsights.filter(s => s.rating <= 2).length
          }
        },
        chatStats: {
          totalMessages: chatStats.totalMessages,
          waiterMessages: chatStats.waiterMessages,
          avgMessagesPerRequest: Math.round(chatStats.avgMessagesPerRequest * 100) / 100,
          waiterCommunication: Array.from(chatStats.messagesByWaiter.entries()).map(([waiterId, data]) => ({
            waiterId,
            name: data.name,
            messageCount: data.messageCount
          }))
        },
        keyMetrics: {
          topPerformer: Array.from(waiterStats.entries())
            .sort(([,a], [,b]) => {
              const aRate = a.totalRequests > 0 ? a.completedRequests / a.totalRequests : 0;
              const bRate = b.totalRequests > 0 ? b.completedRequests / b.totalRequests : 0;
              return bRate - aRate;
            })[0]?.[1]?.name || 'N/A',
          totalStaff: waiterStats.size
        }
      };

      // Generate LLM analysis
      const llmAnalysis = await this.generateExecutiveSummaryWithLLM(executiveDataForLLM);

      const result = {
        overview: {
          totalRequests,
          completedRequests,
          openRequests,
          completionRate: Math.round(completionRate * 100) / 100,
          avgResponseTime: Math.round(avgResponseTime * 100) / 100,
          avgServiceRating: Math.round(avgServiceRating * 100) / 100,
          topPerformer: executiveDataForLLM.keyMetrics.topPerformer,
          totalStaff: executiveDataForLLM.keyMetrics.totalStaff
        },
        trends: {
          completionRate: completionRate > 80 ? 'up' : completionRate > 60 ? 'stable' : 'down',
          responseTime: avgResponseTime < 10 ? 'up' : avgResponseTime < 20 ? 'stable' : 'down',
          serviceRating: avgServiceRating > 4 ? 'up' : avgServiceRating > 3 ? 'stable' : 'down'
        },
        alerts: {
          openRequests: openRequests > 0,
          highCancelledRate: cancelledRate > 10,
          slowResponseTime: avgResponseTime > 20,
          lowServiceRating: avgServiceRating < 3
        },
        waiterPerformance: executiveDataForLLM.waiterPerformance,
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
      this.logger.warn('OpenAI API key not configured, returning default insights');
      return {
        summary: 'AI analysis is currently unavailable. Please configure OpenAI API key.',
        keyFindings: [],
        recommendations: [],
        alerts: []
      };
    }

    try {
      const prompt = `As a restaurant operations analyst, analyze this comprehensive executive summary data and provide strategic insights.

DATA SUMMARY:
Period: ${data.dateRange.startDate} to ${data.dateRange.endDate}

OPERATIONAL METRICS:
- Total Requests: ${data.totalRequests}
- Completion Rate: ${data.completionRate}%
- Average Response Time: ${data.avgResponseTime} minutes
- Customer Satisfaction: ${data.avgSatisfactionScore}/5.0
- Staff Count: ${data.keyMetrics.totalStaff}
- Top Performer: ${data.keyMetrics.topPerformer}

STAFF PERFORMANCE:
${data.waiterPerformance.map((w: any) => `- ${w.name}: ${w.completedRequests}/${w.totalRequests} requests (${w.completionRate}%), ${w.avgResponseTime}min avg response`).join('\n')}

SERVICE QUALITY:
- Total Service Analyses: ${data.serviceInsights.totalAnalyses}
- Sentiment Distribution: ${data.serviceInsights.sentimentDistribution.positive} positive, ${data.serviceInsights.sentimentDistribution.neutral} neutral, ${data.serviceInsights.sentimentDistribution.negative} negative

COMMUNICATION:
- Total Chat Messages: ${data.chatStats.totalMessages}
- Messages per Request: ${data.chatStats.avgMessagesPerRequest}

Please provide:
1. Executive summary (2-3 sentences)
2. Key performance findings (3-5 bullet points)
3. Strategic recommendations (3-5 actionable items)
4. Critical alerts (if any performance issues detected)

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
              content: 'You are an expert restaurant operations analyst. Provide strategic, actionable insights based on operational data. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
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

      // Parse JSON response
      let analysisResult;
      try {
        analysisResult = JSON.parse(analysisText);
      } catch (parseError) {
        this.logger.warn('Failed to parse LLM response as JSON, providing fallback');
        analysisResult = {
          summary: "Something went wrong while getting AI response.",
          keyFindings: ['Analysis not done'],
          recommendations: ['Retry the analysis at a later time'],
          alerts: []
        };
      }

      return analysisResult;

    } catch (error) {
      this.logger.error('Failed to generate LLM executive summary:', error);
      throw new Error('LLM analysis service is currently unavailable. Please try again later.');
    }
  }

  async getAIInsights(dateRange?: DateRange, adminSessionId?: string): Promise<any> {
    // Check cache first if adminSessionId is provided
    if (adminSessionId) {
      const cacheKey = `getAIInsights_${adminSessionId}_${JSON.stringify(dateRange)}`;
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.log(`Returning cached AI insights for admin ${adminSessionId}`);
        return cachedResult;
      }
    }

    try {
      // Fetch the same data as staff performance and executive summary
      const staffData = await this.getStaffPerformanceAnalytics(dateRange, undefined, undefined, adminSessionId);
      
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
            gte: new Date(startDate), 
            lte: new Date(endDate) 
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
          dateTime: { gte: new Date(startDate), lte: new Date(endDate) }
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
            gte: new Date(startDate),
            lte: new Date(endDate)
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

IMPORTANT: Use the real sentiment data provided (serviceAnalysis, requestLogs, waiterRatings) to generate accurate sentiment analysis.

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
              content: 'You are an expert restaurant operations analyst specializing in performance optimization, customer sentiment analysis, and operational efficiency. Provide data-driven insights with specific recommendations based on real operational metrics.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
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
        this.logger.error('Failed to parse LLM response for AI insights:', parseError);
        this.logger.error('Raw LLM response:', content);
        // Try to extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          aiInsights = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Unable to process AI insights at this time');
        }
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
        const cacheKey = `getAIInsights_${adminSessionId}_${JSON.stringify(dateRange)}`;
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
}
