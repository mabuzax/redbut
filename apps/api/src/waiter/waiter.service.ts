import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RequestsService } from '../requests/requests.service';
import { RequestStatus } from '@prisma/client'; // Import RequestStatus from Prisma client

/**
 * Service for managing waiter-specific operations and dashboard data.
 * Handles retrieving active requests, updating request status, fetching summaries,
 * reviews, and AI analysis.
 */
@Injectable()
export class WaiterService {
  private readonly logger = new Logger(WaiterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requestsService: RequestsService,
  ) {}

  /**
   * Get a list of active requests for the waiter dashboard.
   * Active requests are those with status 'New', 'Acknowledged', or 'InProgress'.
   * @returns Array of active requests.
   */
  async getActiveRequests(): Promise<any[]> {
    this.logger.log('Fetching active requests for waiter dashboard');
    try {
      const requests = await this.prisma.request.findMany({
        where: {
          status: {
            in: [RequestStatus.New, RequestStatus.Acknowledged, RequestStatus.InProgress],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          content: true,
          status: true,
          createdAt: true,
          tableNumber: true,
        },
      });
      return requests.map(req => ({
        ...req,
        content: req.content.substring(0, 50) + (req.content.length > 50 ? '...' : ''),
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch active requests: ${error.message}`);
      return [];
    }
  }

  /**
   * Update the status of a specific request.
   * @param requestId The ID of the request to update.
   * @param newStatus The new status for the request ('Acknowledged', 'InProgress', 'Completed').
   * @returns The updated request.
   * @throws NotFoundException if the request is not found.
   * @throws BadRequestException if the status transition is invalid.
   */
  async updateRequestStatus(requestId: string, newStatus: 'Acknowledged' | 'InProgress' | 'Completed'): Promise<any> {
    this.logger.log(`Updating request ${requestId} status to ${newStatus}`);
    try {
      // Use the existing requestsService to handle the update logic and validation
      const updatedRequest = await this.requestsService.update(requestId, { status: newStatus });
      return updatedRequest;
    } catch (error) {
      this.logger.error(`Failed to update request status: ${error.message}`);
      throw error; // Re-throw specific exceptions from requestsService
    }
  }

  /**
   * Get a summary of open and closed requests.
   * @returns Object with counts of open and closed requests.
   */
  async getRequestsSummary(): Promise<{ open: number; closed: number }> {
    this.logger.log('Fetching requests summary');
    try {
      const openRequests = await this.prisma.request.count({
        where: {
          status: {
            in: [RequestStatus.New, RequestStatus.Acknowledged, RequestStatus.InProgress],
          },
        },
      });

      const closedRequests = await this.prisma.request.count({
        where: {
          status: {
            in: [RequestStatus.Completed, RequestStatus.Cancelled, RequestStatus.Done],
          },
        },
      });

      return { open: openRequests, closed: closedRequests };
    } catch (error) {
      this.logger.error(`Failed to fetch requests summary: ${error.message}`);
      return { open: 0, closed: 0 };
    }
  }

  /**
   * Get a summary of reviews (average rating and total count).
   * @returns Object with average rating and total reviews.
   */
  async getReviewsSummary(): Promise<{ averageRating: number; totalReviews: number }> {
    this.logger.log('Fetching reviews summary');
    try {
      const result = await this.prisma.review.aggregate({
        _avg: {
          rating: true,
        },
        _count: {
          id: true,
        },
      });

      const averageRating = result._avg.rating ? parseFloat(result._avg.rating.toFixed(1)) : 0;
      const totalReviews = result._count.id;

      return { averageRating, totalReviews };
    } catch (error) {
      this.logger.error(`Failed to fetch reviews summary: ${error.message}`);
      return { averageRating: 0, totalReviews: 0 };
    }
  }

  /**
   * Get a paginated list of reviews.
   * @param page The page number to retrieve.
   * @param pageSize The number of reviews per page.
   * @returns Array of reviews.
   */
  async getPaginatedReviews(page: number = 1, pageSize: number = 10): Promise<any[]> {
    this.logger.log(`Fetching reviews - Page: ${page}, PageSize: ${pageSize}`);
    try {
      const skip = (page - 1) * pageSize;
      const reviews = await this.prisma.review.findMany({
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          rating: true,
          content: true,
          createdAt: true,
        },
      });
      return reviews;
    } catch (error) {
      this.logger.error(`Failed to fetch paginated reviews: ${error.message}`);
      return [];
    }
  }

  /**
   * Get AI analysis of waiter performance for today.
   * This is a placeholder and will return static data for now.
   * @returns AI analysis text.
   */
  async getAIAnalysis(): Promise<string> {
    this.logger.log('Fetching AI analysis of waiter performance');
    // Placeholder for actual AI analysis logic
    return 'Based on current data, your performance today is excellent! Keep up the great work. Average response time is low, and customer satisfaction is high.';
  }
}
