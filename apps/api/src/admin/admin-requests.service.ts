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
    // Get all open (new) requests
    const openRequests = await this.prisma.request.findMany({
      where: {
        status: 'New',
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    // Initialize counters for each time range
    const timeRanges = [
      { range: '<10mins', count: 0 },
      { range: '10-15mins', count: 0 },
      { range: '>15mins', count: 0 },
    ];

    // Calculate time elapsed for each request and increment appropriate counter
    const now = new Date();
    openRequests.forEach((request) => {
      const elapsedMinutes = (now.getTime() - request.createdAt.getTime()) / (1000 * 60);
      
      if (elapsedMinutes < 10) {
        timeRanges[0].count++;
      } else if (elapsedMinutes >= 10 && elapsedMinutes <= 15) {
        timeRanges[1].count++;
      } else {
        timeRanges[2].count++;
      }
    });

    return timeRanges;
  }
}
