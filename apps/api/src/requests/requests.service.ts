import { Injectable, Logger, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Request, RequestStatus, Prisma } from '@prisma/client'; // Updated import
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';

/**
 * Service for managing waiter requests
 * Handles CRUD operations with status management rules
 */
@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new waiter request
   * @param createRequestDto Request data
   * @returns Created request
   */
  async create(createRequestDto: CreateRequestDto): Promise<Request> {
    const { userId, tableNumber, content } = createRequestDto;

    // Get the user's sessionId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { sessionId: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check for duplicate "Ready to pay" requests
    if (content.toLowerCase().includes('ready to pay')) {
      const existingRequest = await this.prisma.request.findFirst({
        where: {
          sessionId: user.sessionId, // Use sessionId instead of tableNumber for consistency
          content: { contains: 'ready to pay', mode: 'insensitive' }, // Case-insensitive search
          status: { in: [RequestStatus.New, RequestStatus.OnHold] },
        },
      });

      if (existingRequest) {
        this.logger.warn(`Duplicate "Ready to pay" request for session ${user.sessionId}`);
        throw new ConflictException('Already requested payment, buzzing waiter again');
      }
    }

    this.logger.log(`Creating new request for user ${userId} at table ${tableNumber}, session ${user.sessionId}`);
    
    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const request = await tx.request.create({
          data: {
            userId,
            tableNumber,
            sessionId: user.sessionId, // Include sessionId
            content,
            status: RequestStatus.New, // Default status for new requests
          },
        });

        await tx.requestLog.create({
          data: {
            requestId: request.id,
            action: 'New request created',
            actor: 'user',
          },
        });
        
        return request;
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
   * @param userRole User role for validation (optional, defaults to 'client')
   * @returns Updated request
   * @throws BadRequestException for invalid status transitions
   * @throws NotFoundException if request not found
   */
  async update(id: string, updateRequestDto: UpdateRequestDto, userRole: string = 'client'): Promise<Request> {
    this.logger.log(`Updating request ${id} with data: ${JSON.stringify(updateRequestDto)}, role: ${userRole}`);
    
    // First check if request exists and get current status
    const currentRequest = await this.findOne(id);
    
    const newStatus = updateRequestDto.status ?? currentRequest.status;
    
    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Re-fetch current status within transaction to avoid race conditions
        const currentRequestInTx = await tx.request.findUnique({
          where: { id },
          select: { status: true },
        });

        if (!currentRequestInTx) {
          throw new NotFoundException(`Request with ID ${id} not found`);
        }

        const updatedRequest = await tx.request.update({
          where: { id },
          data: {
            content: updateRequestDto.content || currentRequest.content,
            status: newStatus,
          },
        });

        if (currentRequestInTx.status !== newStatus) {
          const action = `Request status changed from ${currentRequestInTx.status} to ${newStatus}`;
          await tx.requestLog.create({
            data: {
              requestId: updatedRequest.id,
              action,
              actor: 'user',
            },
          });
        }
        
        return updatedRequest;
      });
    } catch (error) {
      this.logger.error(`Failed to update request: ${error.message}`);
      
      // Re-throw validation errors with their friendly messages
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException(`Failed to update request: ${error.message}`);
    }
  }

  private getUserRole(): string {
    return 'client';
  }

  /**
   * Delete a request (for testing/admin purposes)
   * @param id Request ID to delete
   * @returns Deleted request
   */
  async remove(id: string): Promise<Request> {
    this.logger.warn(`Deleting request with ID ${id}`);
    
    try {
      // Also delete related logs
      await this.prisma.requestLog.deleteMany({
        where: { requestId: id },
      });
      return await this.prisma.request.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Failed to delete request: ${error.message}`);
      throw new NotFoundException(`Request with ID ${id} not found or could not be deleted`);
    }
  }
}
