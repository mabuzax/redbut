import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma, Review, Shift, Waiter, WaiterRating, OrderStatus, RequestStatus as PrismaRequestStatus, Order, OrderItem, MenuItem, Request as PrismaRequestType, RequestLog } from '@prisma/client';
import {
  SalesAnalyticsData,
  PopularItemsAnalyticsData,
  ShiftsAnalyticsData,
  HourlySalesAnalyticsData,
  StaffAnalyticsData,
  TablesAnalyticsData,
  WaiterRatingsAnalyticsData,
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
  RequestsSummaryMetrics,
  RequestStatusDistribution,
  RequestsOverTimeDataPoint,
  WaiterResponseTimeDataPoint,
  OverallRestaurantRating,
  CustomerSatisfactionTrendDataPoint,
  FeedbackTheme,
} from './admin-analytics.types';
import { subDays, startOfMonth, endOfMonth, startOfDay, endOfDay, eachDayOfInterval, format, getHours } from 'date-fns';

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

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
        let shiftsWorkedCount = 0;
        let totalHoursWorked = 0;
        
        const waiterAllocations = await this.prisma.tableAllocation.findMany({
            where: { 
                waiterId: waiter.id,
                shift: {
                    AND: [
                        { startTime: { lte: new Date(endDate) } },
                        { endTime: { gte: new Date(startDate) } },
                    ]
                }
      },
            include: { shift: true }
        });

        shiftsWorkedCount = new Set(waiterAllocations.map(alloc => alloc.shiftId)).size;

        for (const alloc of waiterAllocations) {
            totalHoursWorked += (alloc.shift.endTime.getTime() - alloc.shift.startTime.getTime()) / (1000 * 60 * 60);
            const ordersForAllocation = await this.prisma.order.findMany({
                where: {
                    tableNumber: { in: alloc.tableNumbers },
                    createdAt: { gte: alloc.shift.startTime, lte: alloc.shift.endTime }
                },
                include: { orderItems: true }
            });
            ordersForAllocation.forEach(order => {
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
        
        const avgRating = waiter.ratings.length > 0 
            ? waiter.ratings.reduce((sum, r) => sum + (r.friendliness + r.orderAccuracy + r.speed + r.attentiveness + r.knowledge) / 5, 0) / waiter.ratings.length
            : 0;

        const requestsHandled = 0; // Placeholder - requires linking requests to waiters

        performanceDetails.push({
            staffId: waiter.id,
            staffName,
            position: waiter.accessAccount?.userType.toString() || 'Waiter',
            shiftsWorked: shiftsWorkedCount,
            totalHoursWorked: parseFloat(totalHoursWorked.toFixed(1)),
            averageRating: parseFloat(avgRating.toFixed(1)),
            requestsHandled, 
        });
    }

    return { 
        salesPerformance: salesPerformance.sort((a,b) => b.totalSales - a.totalSales), 
        orderCounts: orderCounts.sort((a,b) => b.value - a.value), 
        performanceDetails 
    };
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

  async getWaiterRatingsAnalytics(dateRange?: DateRange): Promise<WaiterRatingsAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(30);
    this.logger.log(`Fetching waiter ratings analytics from ${startDate} to ${endDate}`);

    const waiters = await this.prisma.waiter.findMany({ 
        include: { 
            ratings: { 
                where: { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } },
                orderBy: { createdAt: 'desc'}
            } 
        } 
    });
    
    const allRatingsInPeriod = await this.prisma.waiterRating.findMany({ 
        where: { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } }, 
        include: {waiter: {select: {name: true, surname: true, tag_nickname: true}}},
        orderBy: { createdAt: 'desc'}
    });

    const averageRatingsPerWaiter: WaiterAverageRating[] = waiters.map(waiter => {
      const ratings = waiter.ratings;
      const avg = ratings.length > 0 ? ratings.reduce((sum, r) => sum + (r.friendliness + r.orderAccuracy + r.speed + r.attentiveness + r.knowledge) / 5, 0) / ratings.length : 0;
      return { name: `${waiter.name} ${waiter.surname} (${waiter.tag_nickname})`, value: parseFloat(avg.toFixed(1)), waiterId: waiter.id, totalRatings: ratings.length };
    }).sort((a,b) => b.value - a.value);

    const ratingCounts = [0,0,0,0,0]; // for 1 to 5 stars
    allRatingsInPeriod.forEach(r => {
        const avgForRating = Math.round((r.friendliness + r.orderAccuracy + r.speed + r.attentiveness + r.knowledge) / 5);
        if(avgForRating >=1 && avgForRating <=5) ratingCounts[avgForRating-1]++;
      });
    const overallRatingDistribution: RatingDistributionDataPoint[] = ratingCounts.map((count, i) => ({ name: `${i+1} Star${i === 0 ? '': 's'}`, value: count }));

    const ratingsTrendMap = new Map<string, { sum: number; count: number }>();
    allRatingsInPeriod.forEach(r => {
        const day = format(r.createdAt, 'yyyy-MM-dd');
        const current = ratingsTrendMap.get(day) || { sum: 0, count: 0 };
        current.sum += (r.friendliness + r.orderAccuracy + r.speed + r.attentiveness + r.knowledge) / 5;
        current.count += 1;
        ratingsTrendMap.set(day, current);
    });
    const ratingsTrend: RatingsOverTimeDataPoint[] = Array.from(ratingsTrendMap.entries()).map(([date, data]) => ({
        date, averageRating: data.count > 0 ? parseFloat((data.sum/data.count).toFixed(1)) : 0
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const recentComments: RecentComment[] = allRatingsInPeriod
        .filter(r => r.comment)
        .slice(0,10)
        .map(r => ({
            commentId: r.id,
            waiterId: r.waiterId,
            waiterName: `${r.waiter.name} ${r.waiter.surname}`,
            rating: Math.round((r.friendliness + r.orderAccuracy + r.speed + r.attentiveness + r.knowledge) / 5),
            commentText: r.comment!,
            commentDate: r.createdAt.toISOString(),
        }));
        
    const ratingsBreakdownPerWaiter: WaiterRatingsBreakdown[] = waiters.map(waiter => {
        const ratings = waiter.ratings;
        return {
            waiterId: waiter.id,
            waiterName: `${waiter.name} ${waiter.surname} (${waiter.tag_nickname})`,
            averageFriendliness: ratings.length > 0 ? parseFloat((ratings.reduce((s,r) => s + r.friendliness, 0) / ratings.length).toFixed(1)) : 0,
            averageOrderAccuracy: ratings.length > 0 ? parseFloat((ratings.reduce((s,r) => s + r.orderAccuracy, 0) / ratings.length).toFixed(1)) : 0,
            averageSpeed: ratings.length > 0 ? parseFloat((ratings.reduce((s,r) => s + r.speed, 0) / ratings.length).toFixed(1)) : 0,
            averageAttentiveness: ratings.length > 0 ? parseFloat((ratings.reduce((s,r) => s + r.attentiveness, 0) / ratings.length).toFixed(1)) : 0,
            averageKnowledge: ratings.length > 0 ? parseFloat((ratings.reduce((s,r) => s + r.knowledge, 0) / ratings.length).toFixed(1)) : 0,
            totalRatings: ratings.length,
        };
    });

    return { averageRatingsPerWaiter, overallRatingDistribution, ratingsTrend, recentComments, ratingsBreakdownPerWaiter };
  }

  async getRequestsAnalytics(dateRange?: DateRange): Promise<RequestsAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(7);
    this.logger.log(`Fetching requests analytics from ${startDate} to ${endDate}`);

    const requests = await this.prisma.request.findMany({
      where: { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } },
      include: { logs: { orderBy: { dateTime: 'asc' } } },
    });

    let totalResponseTimeSum = 0;
    let respondedRequestsCount = 0;
    requests.forEach(req => {
        if (req.status !== PrismaRequestStatus.New) { 
            const firstLogNotNew = req.logs.find(log => log.action.includes("status changed from New to"));
            if(firstLogNotNew) {
                totalResponseTimeSum += (firstLogNotNew.dateTime.getTime() - req.createdAt.getTime());
                respondedRequestsCount++;
            } else if (req.updatedAt.getTime() !== req.createdAt.getTime()) { 
                 totalResponseTimeSum += (req.updatedAt.getTime() - req.createdAt.getTime());
                 respondedRequestsCount++;
            }
        }
    });
    const averageResponseTimeMinutes = respondedRequestsCount > 0 ? (totalResponseTimeSum / respondedRequestsCount / (1000 * 60)) : 0;
    
    const completedOrDone = requests.filter(r => r.status === PrismaRequestStatus.Completed || r.status === PrismaRequestStatus.Done).length;
    const totalNonCancelled = requests.filter(r => r.status !== PrismaRequestStatus.Cancelled).length;
    const completionRatePercentage = totalNonCancelled > 0 ? (completedOrDone / totalNonCancelled) * 100 : 0;

    const summaryMetrics: RequestsSummaryMetrics = {
      totalRequests: requests.length,
      averageResponseTimeMinutes: parseFloat(averageResponseTimeMinutes.toFixed(1)),
      completionRatePercentage: parseFloat(completionRatePercentage.toFixed(1)),
      openRequests: requests.filter(r =>
        r.status === PrismaRequestStatus.New ||
        r.status === PrismaRequestStatus.Acknowledged ||
        r.status === PrismaRequestStatus.InProgress
      ).length,
    };

    const statusCounts = await this.prisma.request.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } },
      });
    const statusDistribution: RequestStatusDistribution[] = statusCounts.map(s => ({ name: s.status.toString(), value: s._count.id }));

    const requestsOverTimeMap = new Map<string, { newRequests: number; resolvedRequests: number }>();
     eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) }).forEach(day => {
        requestsOverTimeMap.set(format(day, 'yyyy-MM-dd'), { newRequests: 0, resolvedRequests: 0 });
    });
    requests.forEach(req => {
        const day = format(req.createdAt, 'yyyy-MM-dd');
        const current = requestsOverTimeMap.get(day) || { newRequests: 0, resolvedRequests: 0 };
        current.newRequests +=1;
        if(req.status === PrismaRequestStatus.Completed || req.status === PrismaRequestStatus.Done) current.resolvedRequests +=1;
        requestsOverTimeMap.set(day, current);
    });
    const requestsOverTime: RequestsOverTimeDataPoint[] = Array.from(requestsOverTimeMap.entries()).map(([time, data]) => ({ time, ...data}));
    
    const waiterResponseTimes: WaiterResponseTimeDataPoint[] = []; 
    const waiterRequestPerformance: StaffPerformanceDetail[] = []; 

    return { summaryMetrics, statusDistribution, requestsOverTime, waiterResponseTimes, waiterRequestPerformance };
  }

  async getCustomerRatingsAnalytics(dateRange?: DateRange): Promise<CustomerRatingsAnalyticsData> {
    const { startDate, endDate } = dateRange || this.getDefaultDateRange(30);
    this.logger.log(`Fetching customer ratings analytics from ${startDate} to ${endDate}`);
  
    const reviews = await this.prisma.review.findMany({
      where: { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } },
      orderBy: { createdAt: 'desc' },
    });

    const overallRestaurantRating: OverallRestaurantRating = {
      averageOverallRating: reviews.length > 0 ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)) : 0,
      totalReviews: reviews.length,
    };
    
    const satisfactionTrendMap = new Map<string, { sum: number; count: number }>();
    reviews.forEach(r => {
        const day = format(r.createdAt, 'yyyy-MM-dd');
        const current = satisfactionTrendMap.get(day) || { sum: 0, count: 0 };
        current.sum += r.rating;
        current.count += 1;
        satisfactionTrendMap.set(day, current);
    });
    const satisfactionTrend: CustomerSatisfactionTrendDataPoint[] = Array.from(satisfactionTrendMap.entries()).map(([date, data]) => ({
        date, satisfactionScore: data.count > 0 ? parseFloat((data.sum/data.count).toFixed(1)) : 0
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const topFeedbackThemes: FeedbackTheme[] = reviews.slice(0, 5).map(r => ({ name: r.content.substring(0,50) + (r.content.length > 50 ? "..." : ""), value: r.rating }));

    return { overallRestaurantRating, satisfactionTrend, topFeedbackThemes };
  }
}
