import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

/**
 * Service for user management operations
 * Handles creating and retrieving user data
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an anonymous user with the given table number and session ID
   * @param data Object containing tableNumber and sessionId
   * @returns Created user object
   */
  async createAnonymousUser(data: { tableNumber: number; sessionId: string }): Promise<User> {
    const { tableNumber, sessionId } = data;

    this.logger.log(`Creating anonymous user for table ${tableNumber} with session ${sessionId}`);
    
    try {
      return await this.prisma.user.create({
        data: {
          tableNumber,
          sessionId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create anonymous user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find a user by their ID
   * @param id User ID to search for
   * @returns User object if found, null otherwise
   */
  async findById(id: string): Promise<User | null> {
    this.logger.debug(`Finding user by ID: ${id}`);
    
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        this.logger.warn(`User with ID ${id} not found`);
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error(`Error finding user by ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Find a user by their session ID
   * @param sessionId Session ID to search for
   * @returns User object if found
   * @throws NotFoundException if user not found
   */
  async findBySessionId(sessionId: string): Promise<User> {
    this.logger.debug(`Finding user by session ID: ${sessionId}`);
    
    try {
      const user = await this.prisma.user.findFirst({
        where: { sessionId },
      });

      if (!user) {
        this.logger.warn(`User with session ID ${sessionId} not found`);
        throw new NotFoundException(`User with session ID ${sessionId} not found`);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Error finding user by session ID: ${error.message}`);
      throw new NotFoundException(`Error finding user: ${error.message}`);
    }
  }

  /**
   * Find users by table number
   * @param tableNumber Table number to search for
   * @returns Array of user objects
   */
  async findByTableNumber(tableNumber: number): Promise<User[]> {
    this.logger.debug(`Finding users at table ${tableNumber}`);
    
    try {
      return await this.prisma.user.findMany({
        where: { tableNumber },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error finding users by table number: ${error.message}`);
      return [];
    }
  }
}
