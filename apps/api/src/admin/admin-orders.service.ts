import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  CurrentShiftOrdersDataPoint,
  DailyOrdersDataPoint,
  OrderInsightsData,
  TopSellingItem,
} from './admin-orders.types';

@Injectable()
export class AdminOrdersService {
  private readonly logger = new Logger(AdminOrdersService.name);

  constructor(private prisma: PrismaService) {}

  private async getCurrentShiftTimeframe(): Promise<{ start: Date; end: Date; label: string }> {
    const now = new Date();
    // Since we removed shift system, use current day timeframe
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    this.logger.log(`Using current day timeframe: ${startOfDay} - ${now}`);
    return { 
      start: startOfDay, 
      end: now, 
      label: "Today"
    };
  }

  async getCurrentShiftOrdersByStatus(): Promise<CurrentShiftOrdersDataPoint[]> {
    this.logger.log('Fetching current shift orders by status');
    const { start: shiftStart, end: shiftEnd } = await this.getCurrentShiftTimeframe();
    const now = new Date();

    const ordersInShift = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: shiftStart,
          lte: shiftEnd,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const hourlyData: { [hour: string]: { newOrders: number; inProgressOrders: number; completedOrders: number } } = {};
    
    let currentTime = new Date(shiftStart);
    while(currentTime <= shiftEnd) {
        const hourLabel = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        hourlyData[hourLabel] = { newOrders: 0, inProgressOrders: 0, completedOrders: 0 };
        currentTime.setHours(currentTime.getHours() + 1);
        if (currentTime > shiftEnd && Object.keys(hourlyData).length === 0) { // Ensure at least one slot if shift is very short
             hourlyData[hourLabel] = { newOrders: 0, inProgressOrders: 0, completedOrders: 0 };
        }
    }
    if (Object.keys(hourlyData).length === 0 && shiftStart <= shiftEnd) { // Handle shifts shorter than 1 hour
         const startLabel = shiftStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
         hourlyData[startLabel] = { newOrders: 0, inProgressOrders: 0, completedOrders: 0 };
    }


    for (const order of ordersInShift) {
      const ageInMinutes = (now.getTime() - order.createdAt.getTime()) / (1000 * 60);
      let status: 'new' | 'inProgress' | 'completed';

      if (ageInMinutes <= 10) {
        status = 'new';
      } else if (ageInMinutes <= 30) {
        status = 'inProgress';
      } else {
        status = 'completed';
      }

      const orderHour = order.createdAt.getHours();
      const orderTimeLabel = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      
      // Find the correct hourly bucket
      let bucketLabel = Object.keys(hourlyData).find(label => {
          const [hour] = label.split(':').map(Number);
          return hour === orderHour;
      });
      
      // If no exact hour match (e.g. shift starts/ends mid-hour), find closest or first/last
      if (!bucketLabel) {
          const orderDate = new Date(order.createdAt);
          orderDate.setMinutes(0,0,0);
          bucketLabel = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          if(!hourlyData[bucketLabel]) { // if this specific label was not pre-created
              const sortedLabels = Object.keys(hourlyData).sort();
              if (order.createdAt < new Date(shiftStart.getFullYear(), shiftStart.getMonth(), shiftStart.getDate(), parseInt(sortedLabels[0].split(':')[0]), parseInt(sortedLabels[0].split(':')[1]))) {
                  bucketLabel = sortedLabels[0];
              } else {
                  bucketLabel = sortedLabels[sortedLabels.length -1];
              }
          }
      }


      if (hourlyData[bucketLabel]) {
        if (status === 'new') hourlyData[bucketLabel].newOrders++;
        else if (status === 'inProgress') hourlyData[bucketLabel].inProgressOrders++;
        else hourlyData[bucketLabel].completedOrders++;
      }
    }
    
    return Object.entries(hourlyData).map(([timeLabel, counts]) => ({
      timeLabel,
      ...counts,
    })).sort((a,b) => a.timeLabel.localeCompare(b.timeLabel));
  }

  async getOrdersPerDayThisMonth(): Promise<DailyOrdersDataPoint[]> {
    this.logger.log('Fetching orders per day for the current month');
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const dailyCounts = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    const aggregatedByDay: { [dateStr: string]: number } = {};
    dailyCounts.forEach(record => {
        const dateStr = record.createdAt.toISOString().split('T')[0];
        if (!aggregatedByDay[dateStr]) {
            aggregatedByDay[dateStr] = 0;
        }
        aggregatedByDay[dateStr] += record._count.id;
    });

    const result: DailyOrdersDataPoint[] = [];
    const currentDate = new Date(firstDayOfMonth);
    while(currentDate <= lastDayOfMonth && currentDate <= now) { // Iterate up to today or end of month
        const dateStr = currentDate.toISOString().split('T')[0];
        result.push({
            date: dateStr,
            totalOrders: aggregatedByDay[dateStr] || 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  async getOrderInsights(): Promise<OrderInsightsData> {
    this.logger.log('Fetching order insights for today');
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);


    const todaysOrders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: now, // up to current time
        },
      },
      include: {
        orderItems: {
          include: { menuItem: { select: { name: true } } },
        },
      },
    });

    // ─── Revenue & AOV ──────────────────────────────────────────────────────
    let totalRevenueToday = 0;
    todaysOrders.forEach(order => {
      order.orderItems.forEach(oi => {
        totalRevenueToday += oi.price.toNumber() * oi.quantity;
      });
    });
    const totalOrdersToday = todaysOrders.length;
    const averageOrderValue =
      totalOrdersToday > 0 ? totalRevenueToday / totalOrdersToday : 0;

    const ordersByHour: { [hour: number]: number } = {};
    for (let i = 0; i < 24; i++) ordersByHour[i] = 0;
    
    todaysOrders.forEach(order => {
        const hour = order.createdAt.getHours();
        ordersByHour[hour]++;
    });

    let peakHour = -1;
    let maxOrdersInPeak = -1;
    for (const hour in ordersByHour) {
        if (ordersByHour[hour] > maxOrdersInPeak) {
            maxOrdersInPeak = ordersByHour[hour];
            peakHour = parseInt(hour);
        }
    }
    const peakOrderHourString = peakHour !== -1 && maxOrdersInPeak > 0
        ? `${String(peakHour).padStart(2, '0')}:00 - ${String(peakHour).padStart(2, '0')}:59` 
        : "N/A (No orders today)";


    // ─── Top-Selling Items ─────────────────────────────────────────────────
    const itemCounts: Record<string, number> = {};
    todaysOrders.forEach(order => {
      order.orderItems.forEach(oi => {
        const name = oi.menuItem.name;
        itemCounts[name] = (itemCounts[name] || 0) + oi.quantity;
      });
    });

    const topSellingItems: TopSellingItem[] = Object.entries(itemCounts)
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRevenueToday: parseFloat(totalRevenueToday.toFixed(2)),
      averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      peakOrderHour: peakOrderHourString,
      topSellingItems,
    };
  }
}
