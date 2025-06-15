import { Injectable, Logger, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Request } from '@prisma/client';
import { RequestStatus } from '../common/types';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';

/**
 * Service for managing waiter requests
 * Handles CRUD operations with status management rules
 */
@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new waiter request
   * @param createRequestDto Request data
   * @returns Created request
   */
  async create(createRequestDto: CreateRequestDto): Promise<Request> {
    const { userId, tableNumber, content } = createRequestDto;

    // Check for duplicate "Ready to pay" requests
    if (content.toLowerCase().includes('ready to pay')) {
      const existingRequest = await this.prisma.request.findFirst({
        where: {
          tableNumber,
          // SQLite doesn't support the `mode` field; perform a simple
          // substring match instead. All comparisons are done on a
          // lower-cased version of the original content above.
          content: { contains: 'ready to pay' },
          status: { in: [RequestStatus.New, RequestStatus.OnHold] },
        },
      });

      if (existingRequest) {
        this.logger.warn(`Duplicate "Ready to pay" request for table ${tableNumber}`);
        throw new ConflictException('Already requested payment, buzzing waiter again');
      }
    }

    this.logger.log(`Creating new request for user ${userId} at table ${tableNumber}`);
    
    try {
      return await this.prisma.request.create({
        data: {
          userId,
          tableNumber,
          content,
          status: RequestStatus.New, // Default status for new requests
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create request: ${error.message}`);
      throw new BadRequestException(`Failed to create request: ${error.message}`);
    }
  }

  /**
   * Find all requests for a specific user
   * @param userId User ID to filter by
   * @returns Array of requests
   */
  async findAllByUserId(userId: string): Promise<Request[]> {
    this.logger.debug(`Finding requests for user ${userId}`);
    
    try {
      return await this.prisma.request.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error finding requests: ${error.message}`);
      return [];
    }
  }

  /**
   * Find all requests for a specific table
   * @param tableNumber Table number to filter by
   * @returns Array of requests
   */
  async findAllByTableNumber(tableNumber: number): Promise<Request[]> {
    this.logger.debug(`Finding requests for table ${tableNumber}`);
    
    try {
      return await this.prisma.request.findMany({
        where: { tableNumber },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error finding requests: ${error.message}`);
      return [];
    }
  }

  /**
   * Find a specific request by ID
   * @param id Request ID
   * @returns Request if found
   * @throws NotFoundException if request not found
   */
  async findOne(id: string): Promise<Request> {
    this.logger.debug(`Finding request with ID ${id}`);
    
    try {
      const request = await this.prisma.request.findUnique({
        where: { id },
      });

      if (!request) {
        throw new NotFoundException(`Request with ID ${id} not found`);
      }

      return request;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Error finding request: ${error.message}`);
      throw new NotFoundException(`Error finding request: ${error.message}`);
    }
  }

  /**
   * Update a request with status management rules
   * @param id Request ID
   * @param updateRequestDto Update data
   * @returns Updated request
   * @throws BadRequestException for invalid status transitions
   * @throws NotFoundException if request not found
   */
  async update(id: string, updateRequestDto: UpdateRequestDto): Promise<Request> {
    this.logger.log(`Updating request ${id} with data: ${JSON.stringify(updateRequestDto)}`);
    
    // Find the current request
    const currentRequest = await this.findOne(id);
    
    // Apply status management rules
    const newStatus = this.validateStatusTransition(
      currentRequest.status,
      updateRequestDto.status,
    );
    
    try {
      return await this.prisma.request.update({
        where: { id },
        data: {
          content: updateRequestDto.content || currentRequest.content,
          status: newStatus,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update request: ${error.message}`);
      throw new BadRequestException(`Failed to update request: ${error.message}`);
    }
  }

  /**
   * Validate status transitions based on business rules
   * @param currentStatus Current request status
   * @param newStatus Requested new status
   * @returns Valid new status
   * @throws BadRequestException for invalid status transitions
   */
  private validateStatusTransition(
    currentStatus: RequestStatus | string,
    newStatus?: RequestStatus,
  ): RequestStatus {
    // If no new status provided, keep current
    if (!newStatus || newStatus === currentStatus) {
      return currentStatus as RequestStatus;
    }

    // Status transition rules based on requirements
    switch (currentStatus) {
      case RequestStatus.OnHold:
      // If on hold, can only activate (New) or cancel
      if (newStatus === RequestStatus.New || newStatus === RequestStatus.Cancelled) {
        return newStatus;
      }
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Only 'New' or 'Cancelled' allowed.`,
      );

      case RequestStatus.Done:
      case RequestStatus.Cancelled:
      case RequestStatus.Completed:
      throw new BadRequestException(
        `Cannot change status from ${currentStatus}. Request is already in a final state.`,
      );

      case RequestStatus.New:
      if (
        newStatus === RequestStatus.Acknowledged ||
        newStatus === RequestStatus.InProgress ||
        newStatus === RequestStatus.OnHold ||
        newStatus === RequestStatus.Cancelled
      ) {
        return newStatus;
      }
      throw new BadRequestException(
        `Cannot move from ${currentStatus} to ${newStatus}. Only 'Cancelled', 'Hold', 'Acknowledged' or 'In Progress' from here.`,
      );

      case RequestStatus.InProgress:
      // From In Progress, can go to Completed, Cancelled or Done
      if (
        newStatus === RequestStatus.Completed ||
        newStatus === RequestStatus.Cancelled ||
        newStatus === RequestStatus.Done
      ) {
        return newStatus;
      }
      throw new BadRequestException(
        `Cannot change from ${currentStatus} to ${newStatus}. Only 'Completed', 'Cancelled' or 'Done' from here.`,
      );

      default:
      return newStatus;
    }
  }

  /**
   * Delete a request (for testing/admin purposes)
   * @param id Request ID to delete
   * @returns Deleted request
   */
  async remove(id: string): Promise<Request> {
    this.logger.warn(`Deleting request with ID ${id}`);
    
    try {
      return await this.prisma.request.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Failed to delete request: ${error.message}`);
      throw new NotFoundException(`Request with ID ${id} not found or could not be deleted`);
    }
  }
}
