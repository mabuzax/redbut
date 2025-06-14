import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Order } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';

/**
 * Service for managing orders and bill calculations
 * Handles retrieving order items and calculating bill totals
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new order item
   * @param createOrderDto Order data
   * @returns Created order
   */
  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { tableNumber, sessionId, item, price } = createOrderDto;

    this.logger.log(`Creating new order item for table ${tableNumber}, session ${sessionId}`);
    
    try {
      return await this.prisma.order.create({
        data: {
          tableNumber,
          sessionId,
          item,
          price,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`);
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Get all orders for a specific table and session
   * @param tableNumber Table number
   * @param sessionId Session ID (optional)
   * @returns Array of orders
   */
  async findByTableAndSession(tableNumber: number, sessionId?: string): Promise<Order[]> {
    this.logger.debug(`Finding orders for table ${tableNumber}${sessionId ? `, session ${sessionId}` : ''}`);
    
    try {
      const whereClause: any = { tableNumber };
      
      // Add sessionId to query if provided
      if (sessionId) {
        whereClause.sessionId = sessionId;
      }
      
      return await this.prisma.order.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Error finding orders: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate the total bill for a table and optional session
   * @param tableNumber Table number
   * @param sessionId Session ID (optional)
   * @returns Bill information with items and total
   */
  async calculateBill(tableNumber: number, sessionId?: string): Promise<{
    items: Order[];
    total: number;
    tableNumber: number;
    sessionId?: string;
  }> {
    this.logger.log(`Calculating bill for table ${tableNumber}${sessionId ? `, session ${sessionId}` : ''}`);
    
    // Get all orders for this table/session
    const items = await this.findByTableAndSession(tableNumber, sessionId);
    
    if (items.length === 0) {
      this.logger.warn(`No orders found for table ${tableNumber}${sessionId ? `, session ${sessionId}` : ''}`);
      return {
        items: [],
        total: 0,
        tableNumber,
        sessionId,
      };
    }
    
    // Calculate total
    const total = items.reduce((sum, order) => {
      return sum + Number(order.price);
    }, 0);
    
    return {
      items,
      total,
      tableNumber,
      sessionId,
    };
  }

  /**
   * Find a specific order by ID
   * @param id Order ID
   * @returns Order if found
   * @throws NotFoundException if order not found
   */
  async findOne(id: string): Promise<Order> {
    this.logger.debug(`Finding order with ID ${id}`);
    
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Error finding order: ${error.message}`);
      throw new NotFoundException(`Error finding order: ${error.message}`);
    }
  }

  /**
   * Delete an order (for admin purposes)
   * @param id Order ID to delete
   * @returns Deleted order
   */
  async remove(id: string): Promise<Order> {
    this.logger.warn(`Deleting order with ID ${id}`);
    
    try {
      return await this.prisma.order.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Failed to delete order: ${error.message}`);
      throw new NotFoundException(`Order with ID ${id} not found or could not be deleted`);
    }
  }

  /**
   * Clear all orders for a table (for admin/testing purposes)
   * @param tableNumber Table number
   * @returns Count of deleted orders
   */
  async clearTableOrders(tableNumber: number): Promise<{ count: number }> {
    this.logger.warn(`Clearing all orders for table ${tableNumber}`);
    
    try {
      const result = await this.prisma.order.deleteMany({
        where: { tableNumber },
      });
      
      return { count: result.count };
    } catch (error) {
      this.logger.error(`Failed to clear table orders: ${error.message}`);
      throw new BadRequestException(`Failed to clear table orders: ${error.message}`);
    }
  }
}
