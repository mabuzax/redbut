import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { Order, OrderStatus, Prisma } from "@prisma/client"; // Added Prisma for types
import { CreateOrderDto } from "./dto/create-order.dto";
import { OrderLogService } from "../common/order-log.service";

/**
 * Service for managing orders and bill calculations
 * Handles retrieving order items and calculating bill totals
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderLogService: OrderLogService,
  ) {}

  /**
   * Create a new order with multiple items
   * @param createOrderDto Order data with items array
   * @returns Created order with items
   */
  async create(createOrderDto: CreateOrderDto): Promise<Order & { orderItems: ({ menuItem: { id: string; name: string; image: string | null } } & { id: string; orderId: string; menuItemId: string; quantity: number; price: Prisma.Decimal; status: OrderStatus; createdAt: Date; updatedAt: Date; })[] }> {
    const { tableNumber, sessionId, userId, items } = createOrderDto;

    this.logger.log(`Creating new order for table ${tableNumber}, session ${sessionId} with ${items.length} items`);
    
    if (!items || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create the main order
        const order = await tx.order.create({
          data: {
            tableNumber,
            sessionId,
            userId: userId || null, // Ensure userId is null if undefined
            status: OrderStatus.New,
          },
        });

        // Create order items
        await tx.orderItem.createMany({
          data: items.map(item => ({
            orderId: order.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: new Prisma.Decimal(item.price), // Ensure price is Decimal
            status: OrderStatus.New,
            selectedOptions: item.selectedOptions ? item.selectedOptions as Prisma.InputJsonValue : Prisma.DbNull,
          })),
        });

        // Return order with items
        const createdOrderWithItems = await tx.order.findUnique({
          where: { id: order.id },
          include: {
            orderItems: {
              include: {
                menuItem: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
        });
        if (!createdOrderWithItems) {
            // This should ideally not happen if the transaction succeeded up to this point
            this.logger.error(`Failed to retrieve created order with items, ID: ${order.id}`);
            throw new Error('Order created but could not be retrieved with items.');
        }

        // Log order creation with items inside the transaction
        await this.orderLogService.logOrderCreation(
          order.id,
          createdOrderWithItems.orderItems,
          'user',
          tx
        );

        return createdOrderWithItems;
      });
    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Get all orders for a specific table and session
   * @param tableNumber Table number
   * @param sessionId Session ID (optional)
   * @returns Array of orders with items
   */
  async findByTableAndSession(tableNumber: number, sessionId?: string): Promise<(Order & { orderItems: ({ menuItem: { id: string; name: string; image: string | null } } & { id: string; orderId: string; menuItemId: string; quantity: number; price: Prisma.Decimal; status: OrderStatus; createdAt: Date; updatedAt: Date; })[] })[]> {
    this.logger.debug(`Finding orders for table ${tableNumber}${sessionId ? `, session ${sessionId}` : ""}`);

    try {
      const whereClause: Prisma.OrderWhereInput = { tableNumber };
      
      if (sessionId) {
        whereClause.sessionId = sessionId;
      }
      
      return await this.prisma.order.findMany({
        where: whereClause,
        include: {
          orderItems: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    } catch (error) {
      this.logger.error(`Error finding orders: ${error.message}`, error.stack);
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
    items: (Order & { orderItems: ({ menuItem: { id: string; name: string; image: string | null } } & { id: string; orderId: string; menuItemId: string; quantity: number; price: Prisma.Decimal; status: OrderStatus; createdAt: Date; updatedAt: Date; })[] })[];
    total: number;
    tableNumber: number;
    sessionId?: string;
  }> {
    this.logger.log(`Calculating bill for table ${tableNumber}${sessionId ? `, session ${sessionId}` : ""}`);

    const ordersWithItems = await this.findByTableAndSession(tableNumber, sessionId);

    if (ordersWithItems.length === 0) {
      this.logger.warn(`No orders found for table ${tableNumber}${sessionId ? `, session ${sessionId}` : ""}`);
      return {
        items: [],
        total: 0,
        tableNumber,
        sessionId,
      };
    }

    let total = 0;
    ordersWithItems.forEach(order => {
      if (order.orderItems) { // Ensure orderItems is not null or undefined
        order.orderItems.forEach(item => {
          total += item.price.toNumber() * item.quantity;
        });
      }
    });
    
    return {
      items: ordersWithItems,
      total: parseFloat(total.toFixed(2)),
      tableNumber,
      sessionId,
    };
  }

  /**
   * Find a specific order by ID
   * @param id Order ID
   * @returns Order if found with items
   * @throws NotFoundException if order not found
   */
  async findOne(id: string): Promise<Order & { orderItems: ({ menuItem: { id: string; name: string; image: string | null } } & { id: string; orderId: string; menuItemId: string; quantity: number; price: Prisma.Decimal; status: OrderStatus; createdAt: Date; updatedAt: Date; })[] }> {
    this.logger.debug(`Finding order with ID ${id}`);

    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
        include: {
          orderItems: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Error finding order: ${error.message}`, error.stack);
      throw new NotFoundException(`Error finding order: ${error.message}`);
    }
  }

  async updateOrderStatus(id: string, status: OrderStatus, userRole?: string) {
    const role = userRole || this.getUserRole();
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { orderItems: true } });
      if (!order) throw new NotFoundException(`Order ${id} not found`);
      if (order.status === OrderStatus.Paid) throw new BadRequestException('Paid order cannot change status');
      if (order.status === status) return order;

      // Store previous status for logging
      const previousStatus = order.status;

      await tx.order.update({ where: { id }, data: { status } });
      await tx.orderItem.updateMany({ where: { orderId: id }, data: { status } });

      // Log status change inside the transaction
      await this.orderLogService.logStatusChange(
        id,
        previousStatus,
        status,
        role,
        tx
      );

      return tx.order.findUniqueOrThrow({ where: { id }, include: { orderItems: true } });
    });
  }

  async updateOrderItemStatus(orderId: string, itemId: string, status: OrderStatus) {
    const userRole = this.getUserRole();
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({ where: { id: itemId } });
      if (!item || item.orderId !== orderId) throw new NotFoundException('Order item not found');
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === OrderStatus.Paid) throw new BadRequestException('Paid order cannot change');

      await tx.orderItem.update({ where: { id: itemId }, data: { status } });
      const remaining = await tx.orderItem.count({ where: { orderId, NOT: { status } } });
      if (remaining === 0) await tx.order.update({ where: { id: orderId }, data: { status } });
      return { success: true };
    });
  }

  /**
   * Placeholder for deriving user role (e.g., from request context/JWT)
   * Currently defaults to 'client'
   */
  private getUserRole(): string {
    return 'client';
  }

  async canModifyOrder(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    const locked: OrderStatus[] = [OrderStatus.InProgress, OrderStatus.Delivered, OrderStatus.Paid];
    if (locked.includes(order.status)) return { canModify: false, reason: `Order is ${order.status}` };
    return { canModify: true };
  }

  /**
   * Delete an order (for admin purposes)
   * @param id Order ID to delete
   * @returns Deleted order
   */
  async remove(id: string): Promise<Order> {
    this.logger.warn(`Deleting order with ID ${id}`);
    
    try {
      // Log order deletion before removing
      await this.orderLogService.logOrderCancellation(
        id,
        'Order deleted by admin',
        'admin'
      );

      // Prisma's onDelete: Cascade on OrderItem.orderId handles deleting orderItems
      return await this.prisma.order.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Failed to delete order: ${error.message}`, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Order with ID ${id} not found.`);
      }
      throw new BadRequestException(`Failed to delete order: ${error.message}`);
    }
  }

  /**
   * Update order item details (quantity, options, etc.)
   * @param orderId Order ID
   * @param itemId Order Item ID  
   * @param updateData Update data
   * @param userId User making the update (for authorization)
   * @returns Updated order item
   */
  async updateOrderItem(
    orderId: string, 
    itemId: string, 
    updateData: { quantity?: number; price?: number; selectedOptions?: string[]; selectedExtras?: string[]; specialInstructions?: string; },
    userId: string
  ): Promise<any> {
    this.logger.log(`Updating order item ${itemId} in order ${orderId}`);

    try {
      // First, verify the order exists and get its current status
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            where: { id: itemId },
            include: { menuItem: true }
          }
        }
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found.`);
      }

      if (order.orderItems.length === 0) {
        throw new NotFoundException(`Order item with ID ${itemId} not found in order ${orderId}.`);
      }

      const orderItem = order.orderItems[0];

      // Check if order can be modified (only allow modifications for New or Acknowledged orders)
      if (order.status !== OrderStatus.New && order.status !== OrderStatus.Acknowledged) {
        throw new BadRequestException(`Cannot modify order items. Order status is ${order.status}.`);
      }

      // Prepare update data, filtering out undefined values
      const updatePayload: any = {};
      
      if (updateData.quantity !== undefined) {
        updatePayload.quantity = updateData.quantity;
      }
      
      if (updateData.price !== undefined) {
        updatePayload.price = updateData.price;
      }

      // Handle selectedOptions and selectedExtras as JSON fields
      if (updateData.selectedOptions !== undefined) {
        updatePayload.selectedOptions = JSON.stringify(updateData.selectedOptions);
      }

      if (updateData.selectedExtras !== undefined) {
        updatePayload.selectedExtras = JSON.stringify(updateData.selectedExtras);
      }

      if (updateData.specialInstructions !== undefined) {
        updatePayload.specialInstructions = updateData.specialInstructions;
      }

      // Update the order item
      const updatedItem = await this.prisma.orderItem.update({
        where: { id: itemId },
        data: updatePayload,
        include: {
          menuItem: {
            select: { id: true, name: true, image: true }
          }
        }
      });

      this.logger.log(`Successfully updated order item ${itemId}`);
      
      return updatedItem;
    } catch (error) {
      this.logger.error(`Failed to update order item: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Order item with ID ${itemId} not found.`);
      }
      
      throw new BadRequestException(`Failed to update order item: ${error.message}`);
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
      this.logger.error(`Failed to clear table orders: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to clear table orders: ${error.message}`);
    }
  }

  async rejectOrderWithReason(
    orderId: string,
    reason: string,
    tableNumber: number,
    userId: string
  ): Promise<{ message: string }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify order exists and can be rejected
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true }
      });

      if (!order) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }

      // Only allow rejection of delivered orders
      if (order.status !== OrderStatus.Delivered) {
        throw new BadRequestException(`Order can only be rejected when delivered. Current status: ${order.status}`);
      }

      // 2. Create request for waiter attention
      const requestMessage = `Attend to Table ${tableNumber}. Client has rejected order number ${orderId.slice(-8)}. Reason: ${reason}`;
      
      // Find user's sessionId for the request
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { sessionId: true }
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      
      await tx.request.create({
        data: {
          content: requestMessage,
          status: 'New',
          userId: userId,
          sessionId: user.sessionId,
          tableNumber: tableNumber,
        }
      });

      // 3. Update order status to rejected
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.Rejected }
      });

      // 4. Update all order items to rejected status
      await tx.orderItem.updateMany({
        where: { orderId: orderId },
        data: { status: OrderStatus.Rejected }
      });

      this.logger.log(`Order ${orderId} rejected by user ${userId} with reason: ${reason}`);
      
      return { message: 'Order rejected successfully and waiter has been notified' };
    });
  }
}
