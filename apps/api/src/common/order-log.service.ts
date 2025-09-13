import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

/**
 * Service for managing order audit logs
 * Tracks all order status changes and important events
 */
@Injectable()
export class OrderLogService {
  private readonly logger = new Logger(OrderLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log order creation with item details
   * @param orderId The order ID
   * @param orderItems Array of order items
   * @param actor Who created the order (customer, waiter, admin)
   * @param tx Optional transaction context
   */
  async logOrderCreation(orderId: string, orderItems: any[], actor: string = 'customer', tx?: any) {
    try {
      const itemNames = orderItems.map(item => {
        let itemDescription = `${item.menuItem?.name || 'Unknown Item'} (x${item.quantity})`;
        
        // Add selected options if they exist
        if (item.selectedOptions && Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0) {
          itemDescription += ` [${item.selectedOptions.join(', ')}]`;
        }
        
        return itemDescription;
      }).join(', ');

      const prismaClient = tx || this.prisma;
      await prismaClient.orderLog.create({
        data: {
          orderId,
          action: `New order created with items: ${itemNames}`,
          actor,
        },
      });

      this.logger.log(`Order creation logged for order ${orderId} by ${actor}`);
    } catch (error) {
      this.logger.error(`Failed to log order creation for ${orderId}: ${error.message}`);
    }
  }

  /**
   * Log order status change
   * @param orderId The order ID
   * @param fromStatus Previous status
   * @param toStatus New status
   * @param actor Who made the change (waiter, admin, system)
   * @param tx Optional transaction context
   */
  async logStatusChange(orderId: string, fromStatus: string, toStatus: string, actor: string = 'system', tx?: any) {
    try {
      const prismaClient = tx || this.prisma;
      await prismaClient.orderLog.create({
        data: {
          orderId,
          action: `Status changed from ${fromStatus} to ${toStatus}`,
          actor,
        },
      });

      this.logger.log(`Status change logged for order ${orderId}: ${fromStatus} → ${toStatus} by ${actor}`);
    } catch (error) {
      this.logger.error(`Failed to log status change for order ${orderId}: ${error.message}`);
    }
  }

  /**
   * Log order cancellation
   * @param orderId The order ID
   * @param reason Cancellation reason
   * @param actor Who cancelled the order
   */
  async logOrderCancellation(orderId: string, reason: string, actor: string = 'system') {
    try {
      await this.prisma.orderLog.create({
        data: {
          orderId,
          action: `Order cancelled. Reason: ${reason}`,
          actor,
        },
      });

      this.logger.log(`Order cancellation logged for order ${orderId} by ${actor}`);
    } catch (error) {
      this.logger.error(`Failed to log order cancellation for ${orderId}: ${error.message}`);
    }
  }

  /**
   * Log order modification (items added/removed)
   * @param orderId The order ID
   * @param changes Description of changes made
   * @param actor Who made the changes
   */
  async logOrderModification(orderId: string, changes: string, actor: string = 'waiter') {
    try {
      await this.prisma.orderLog.create({
        data: {
          orderId,
          action: `Order modified: ${changes}`,
          actor,
        },
      });

      this.logger.log(`Order modification logged for order ${orderId} by ${actor}`);
    } catch (error) {
      this.logger.error(`Failed to log order modification for ${orderId}: ${error.message}`);
    }
  }

  /**
   * Log payment completion
   * @param orderId The order ID
   * @param paymentMethod Payment method used
   * @param amount Payment amount
   * @param actor Who processed the payment
   */
  async logPaymentCompletion(orderId: string, paymentMethod: string, amount: number, actor: string = 'waiter') {
    try {
      await this.prisma.orderLog.create({
        data: {
          orderId,
          action: `Payment completed: $${amount.toFixed(2)} via ${paymentMethod}`,
          actor,
        },
      });

      this.logger.log(`Payment completion logged for order ${orderId} by ${actor}`);
    } catch (error) {
      this.logger.error(`Failed to log payment completion for ${orderId}: ${error.message}`);
    }
  }

  /**
   * Log custom order event
   * @param orderId The order ID
   * @param action Description of the action
   * @param actor Who performed the action
   */
  async logCustomAction(orderId: string, action: string, actor: string = 'system') {
    try {
      await this.prisma.orderLog.create({
        data: {
          orderId,
          action,
          actor,
        },
      });

      this.logger.log(`Custom action logged for order ${orderId}: ${action} by ${actor}`);
    } catch (error) {
      this.logger.error(`Failed to log custom action for order ${orderId}: ${error.message}`);
    }
  }

  /**
   * Get order logs for a specific order
   * @param orderId The order ID
   * @returns Array of order logs
   */
  async getOrderLogs(orderId: string) {
    try {
      return await this.prisma.orderLog.findMany({
        where: { orderId },
        orderBy: { dateTime: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to retrieve logs for order ${orderId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get order logs for multiple orders
   * @param orderIds Array of order IDs
   * @returns Array of order logs
   */
  async getOrderLogsBatch(orderIds: string[]) {
    try {
      return await this.prisma.orderLog.findMany({
        where: { orderId: { in: orderIds } },
        orderBy: { dateTime: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to retrieve logs for multiple orders: ${error.message}`);
      return [];
    }
  }

  /**
   * Get order logs for a date range
   * @param startDate Start date
   * @param endDate End date
   * @param actor Optional actor filter
   * @returns Array of order logs
   */
  async getOrderLogsByDateRange(startDate: Date, endDate: Date, actor?: string) {
    try {
      const where: any = {
        dateTime: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (actor) {
        where.actor = actor;
      }

      return await this.prisma.orderLog.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              tableNumber: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { dateTime: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to retrieve logs for date range: ${error.message}`);
      return [];
    }
  }
}
