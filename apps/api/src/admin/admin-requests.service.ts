import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RequestStatus } from '@prisma/client';

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
          notIn: ['Completed', 'Cancelled', 'Done'],
        },
      },
    });

    // Count closed requests (completed, cancelled, or done)
    const closed = await this.prisma.request.count({
      where: {
        status: {
          in: ['Completed', 'Cancelled', 'Done'],
        },
      },
    });

    // Calculate average resolution time (in minutes)
    const completedRequests = await this.prisma.request.findMany({
      where: {
        status: 'Completed',
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
      const totalResolutionTime = completedRequests.reduce((sum, req) => {
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
      waiterId,
      search,
      sort = 'createdAt',
      page = 1,
      pageSize = 20,
    } = filters;

    // Build where clause based on filters
    const where: any = {};

    // Status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day for inclusive filtering
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateObj;
      }
    }

    // Waiter filter
    // NOTE: Request model does not contain waiterId, ignore waiterId filter

    // Search filter (content text search)
    if (search) {
      where.content = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Build sort object
    const orderBy: any = {};
    switch (sort) {
      case 'status':
        orderBy.status = 'asc';
        break;
      case 'tableNumber':
        orderBy.tableNumber = 'asc';
        break;
      case 'createdAt':
      default:
        orderBy.createdAt = 'desc'; // Newest first
        break;
    }

    // Execute query with pagination
    const skip = (page - 1) * pageSize;
    const requests = await this.prisma.request.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    });

    // Format response
    return requests.map((request) => ({
      id: request.id,
      tableNumber: request.tableNumber,
      content: request.content,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      waiterId: null,
      waiterName: null,
      // Calculate response time in minutes if request is completed
      responseTime: request.status === 'Completed'
        ? Math.round((request.updatedAt.getTime() - request.createdAt.getTime()) / (1000 * 60))
        : undefined,
    }));
  }

  /**
   * Get hourly analytics for a specific date (7am to 2am next day)
   * Used for the line chart in the admin dashboard
   */
  async getHourlyRequestAnalytics(dateStr: string) {
    // Parse the input date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format. Please use YYYY-MM-DD');
    }

    // Create start date (7am on the specified date)
    const startDate = new Date(date);
    startDate.setHours(7, 0, 0, 0);

    // Create end date (2am on the next day)
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1); // Next day
    endDate.setHours(2, 0, 0, 0);

    // Get all requests created between start and end date
    const requests = await this.prisma.request.findMany({
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

    // Initialize hourly data array (7am to 2am next day = 19 hours)
    const hourly = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      open: 0,
      closed: 0,
    }));

    // Populate hourly data
    requests.forEach((request) => {
      const hour = request.createdAt.getHours();
      
      // Determine if the request is open or closed
      const isOpen = !['Completed', 'Cancelled', 'Done'].includes(request.status);
      
      // Increment the appropriate counter
      if (isOpen) {
        hourly[hour].open++;
      } else {
        hourly[hour].closed++;
      }
    });

    // Return data in the format expected by the frontend
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
    // kept for backwards-compat – delegates to new resolution analytics
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

    /* ------------------------------------------------------------------ */
    /* 1. find all logs that mark completion on the selected calendar day */
    /* ------------------------------------------------------------------ */
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

    /* ------------------------------------------------------------------ */
    /* 2. for each completed request fetch the first creation log         */
    /* ------------------------------------------------------------------ */
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

      if (!firstLog) continue; // skip if malformed

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
}
