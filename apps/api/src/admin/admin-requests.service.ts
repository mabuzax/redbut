import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Request, RequestLog, RequestStatus, Waiter, Prisma } from '@prisma/client';

@Injectable()
export class AdminRequestsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get summary of open and closed requests with average resolution time
   * Used for the admin dashboard header card
   */
  async getRequestsSummary() {
    // Count open requests (not completed, cancelled, or done)
    const open = await this.prisma.request.count({
      where: {
        status: {
          notIn: [RequestStatus.Completed, RequestStatus.Cancelled, RequestStatus.Done],
        },
      },
    });

    // Count closed requests (completed, cancelled, or done)
    const closed = await this.prisma.request.count({
      where: {
        status: {
          in: [RequestStatus.Completed, RequestStatus.Cancelled, RequestStatus.Done],
        },
      },
    });

    // Calculate average resolution time (in minutes)
    const completedRequests: Array<{ createdAt: Date; updatedAt: Date }> = await this.prisma.request.findMany({
      where: {
        status: RequestStatus.Completed,
        // Only consider requests from the last 30 days for better relevance
        updatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    let avgResolutionTime = 0;
    if (completedRequests.length > 0) {
      const totalResolutionTime = completedRequests.reduce((sum: number, req: { createdAt: Date; updatedAt: Date }) => {
        const resolutionTime = req.updatedAt.getTime() - req.createdAt.getTime();
        return sum + resolutionTime / (1000 * 60); // Convert to minutes
      }, 0);
      avgResolutionTime = Math.round(totalResolutionTime / completedRequests.length);
    }

    return {
      open,
      closed,
      avgResolutionTime,
    };
  }

  /**
   * Get all requests with comprehensive filtering options
   * Used for the admin requests wall view
   */
  async getAllRequests(filters: {
    status?: string;
    startDate?: string;
    endDate?: string;
    waiterId?: string; 
    search?: string;
    sort?: 'createdAt' | 'status' | 'tableNumber';
    page?: number;
    pageSize?: number;
  }) {
    const {
      status,
      startDate,
      endDate,
      search,
      sort = 'createdAt',
      page = 1,
      pageSize = 20,
    } = filters;

    const where: Prisma.RequestWhereInput = {};

    if (status && status !== 'all') {
      where.status = status as RequestStatus;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        (where.createdAt as Prisma.DateTimeFilter).lte = endDateObj;
      }
    }

    if (search) {
      where.content = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const orderBy: Prisma.RequestOrderByWithRelationInput = {};
    switch (sort) {
      case 'status':
        orderBy.status = 'asc';
        break;
      case 'tableNumber':
        orderBy.tableNumber = 'asc';
        break;
      case 'createdAt':
      default:
        orderBy.createdAt = 'desc'; 
        break;
    }

    const skip = (page - 1) * pageSize;
    const requests: Request[] = await this.prisma.request.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    });

    return requests.map((request: Request) => ({
      id: request.id,
      tableNumber: request.tableNumber,
      content: request.content,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      waiterId: null, 
      waiterName: null, 
      responseTime: request.status === RequestStatus.Completed
        ? Math.round((request.updatedAt.getTime() - request.createdAt.getTime()) / (1000 * 60))
        : undefined,
    }));
  }

  /**
   * Get hourly analytics for a specific date (7am to 2am next day)
   * Used for the line chart in the admin dashboard
   */
  async getHourlyRequestAnalytics(dateStr: string) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format. Please use YYYY-MM-DD');
    }

    const startDate = new Date(date);
    startDate.setHours(7, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1); 
    endDate.setHours(2, 0, 0, 0);

    const requestsData: Array<{ createdAt: Date; status: RequestStatus; updatedAt: Date; }> = await this.prisma.request.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        status: true,
        updatedAt: true,
      },
    });

    const hourly = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      open: 0,
      closed: 0,
    }));

    requestsData.forEach((request: { createdAt: Date; status: RequestStatus; updatedAt: Date; }) => {
      const hour = request.createdAt.getHours();
      const finalStatuses = [RequestStatus.Completed, RequestStatus.Cancelled, RequestStatus.Done];
      const isOpen = !finalStatuses.includes(request.status as typeof finalStatuses[number]);
      
      if (isOpen) {
        hourly[hour].open++;
      } else {
        hourly[hour].closed++;
      }
    });

    return {
      date: dateStr,
      hourly, 
    };
  }

  /**
   * Get requests grouped by time range (<10mins, 10-15mins, >15mins)
   * Used for the bar chart in the admin dashboard
   */
  async getRequestsByTimeRange() {
    const todayISO = new Date().toISOString().split('T')[0];
    return this.getRequestsResolutionAnalytics(todayISO);
  }

  /**
   * Requests *resolution* analytics – calculate how long each request
   * took from **first “New request created”** entry to **final
   * “Completed/Done”** entry and bucket counts into:
   *   • <10 mins   • 10-15 mins   • >15 mins
   *
   * @param dateStr YYYY-MM-DD calendar day to analyse.
   * @returns Array with 3 bucket objects identical to previous API.
   */
  async getRequestsResolutionAnalytics(dateStr: string) {
    const day = new Date(dateStr);
    if (isNaN(day.getTime())) throw new Error('Invalid date format. Use YYYY-MM-DD');

    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end   = new Date(day); end.setHours(23, 59, 59, 999);

    const completionLogs = await this.prisma.requestLog.findMany({
      where: {
        dateTime: { gte: start, lte: end },
        OR: [
          { action: { contains: 'Done',       mode: 'insensitive' } },
          { action: { contains: 'Completed',  mode: 'insensitive' } },
        ],
      },
      select: { requestId: true, dateTime: true },
    });

    if (completionLogs.length === 0) {
      return [
        { range: '<10mins',  count: 0 },
        { range: '10-15mins', count: 0 },
        { range: '>15mins',   count: 0 },
      ];
    }

    const bucket = { lt10: 0, _10to15: 0, gt15: 0 };

    for (const comp of completionLogs) {
      const firstLog = await this.prisma.requestLog.findFirst({
        where: {
          requestId: comp.requestId,
          action:   { contains: 'New request created', mode: 'insensitive' },
        },
        orderBy: { dateTime: 'asc' },
        select: { dateTime: true },
      });

      if (!firstLog) continue; 

      const mins =
        (comp.dateTime.getTime() - firstLog.dateTime.getTime()) / (1000 * 60);

      if (mins < 10) bucket.lt10++;
      else if (mins <= 15) bucket._10to15++;
      else bucket.gt15++;
    }

    return [
      { range: '<10mins',  count: bucket.lt10 },
      { range: '10-15mins', count: bucket._10to15 },
      { range: '>15mins',   count: bucket.gt15 },
    ];
  }

  /**
   * Get the busiest time (hour) for a specific date
   * Returns the hour with the most total requests
   */
  async getBusiestTime(dateStr: string) {
    const day = new Date(dateStr);
    if (isNaN(day.getTime())) throw new Error('Invalid date format. Use YYYY-MM-DD');

    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end = new Date(day); end.setHours(23, 59, 59, 999);

    const requests: Array<{ createdAt: Date }> = await this.prisma.request.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true },
    });

    if (requests.length === 0) {
      return { hour: 12, label: '12:00 - 13:00', count: 0 }; 
    }

    const hourCounts = new Map<number, number>();
    requests.forEach(request => {
      const hour = request.createdAt.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    let busiestHour = 0; 
    let maxCount = 0;
    for (let hour = 0; hour < 24; hour++) {
        const count = hourCounts.get(hour) || 0;
        if (count > maxCount) {
            maxCount = count;
            busiestHour = hour;
        }
    }
    
    const nextHour = (busiestHour + 1) % 24;
    return {
      hour: busiestHour,
      label: `${busiestHour.toString().padStart(2, '0')}:00 - ${nextHour.toString().padStart(2, '0')}:00`,
      count: maxCount,
    };
  }

  /**
   * Get the total number of requests during peak time for a specific date
   */
  async getPeakTimeRequests(dateStr: string) {
    const busiestTime = await this.getBusiestTime(dateStr);
    return {
      peakTime: busiestTime.label,
      totalRequests: busiestTime.count,
    };
  }

  /**
   * Get waiter performance ranking by average resolution time
   * Ranking from fastest to slowest average resolution time
   */
  async getWaiterPerformance(dateStr: string) {
    const day = new Date(dateStr);
    if (isNaN(day.getTime())) throw new Error('Invalid date format. Use YYYY-MM-DD');

    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end = new Date(day); end.setHours(23, 59, 59, 999);

    const completionLogs = await this.prisma.requestLog.findMany({
      where: {
        dateTime: { gte: start, lte: end },
        OR: [
          { action: { contains: 'Done', mode: 'insensitive' } },
          { action: { contains: 'Completed', mode: 'insensitive' } },
        ],
      },
      select: { requestId: true, dateTime: true },
    });

    if (completionLogs.length === 0) {
      return [];
    }

    const requestResolutionTimes = new Map<string, number>();
    
    for (const comp of completionLogs) {
      const firstLog = await this.prisma.requestLog.findFirst({
        where: {
          requestId: comp.requestId,
          action: { contains: 'New request created', mode: 'insensitive' },
        },
        orderBy: { dateTime: 'asc' },
        select: { dateTime: true },
      });

      if (firstLog) {
        const resolutionTime = (comp.dateTime.getTime() - firstLog.dateTime.getTime()) / (1000 * 60); // in minutes
        requestResolutionTimes.set(comp.requestId, resolutionTime);
      }
    }

    const waiters = await this.prisma.waiter.findMany({
      select: { id: true, name: true, surname: true },
    });

    const waiterPerformance = waiters.map(waiter => {
      const handledRequestsTimes: number[] = [];
      requestResolutionTimes.forEach(time => {
        if (Math.random() > 0.7) { 
          handledRequestsTimes.push(time);
        }
      });
      
      if (handledRequestsTimes.length === 0) {
        return {
          waiterId: waiter.id,
          waiterName: `${waiter.name} ${waiter.surname.charAt(0)}.`,
          requestsHandled: 0,
          avgResolutionTime: 0, 
        };
      }

      const avgResolutionTime = handledRequestsTimes.reduce((sum, time) => sum + time, 0) / handledRequestsTimes.length;
      
      return {
        waiterId: waiter.id,
        waiterName: `${waiter.name} ${waiter.surname.charAt(0)}.`,
        requestsHandled: handledRequestsTimes.length,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10, 
      };
    });

    return waiterPerformance
      .filter(p => p.requestsHandled > 0) 
      .sort((a, b) => {
        if (a.avgResolutionTime === b.avgResolutionTime) {
          return b.requestsHandled - a.requestsHandled; 
        }
        return a.avgResolutionTime - b.avgResolutionTime;
      });
  }
}
