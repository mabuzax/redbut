import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { Order, OrderStatus, Prisma } from "@prisma/client"; // Added Prisma for types
import { CreateOrderDto } from "./dto/create-order.dto";

/**
 * Service for managing orders and bill calculations
 * Handles retrieving order items and calculating bill totals
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

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

  async updateOrderStatus(id: string, status: OrderStatus) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { orderItems: true } });
      if (!order) throw new NotFoundException(`Order ${id} not found`);
      if (order.status === OrderStatus.Paid) throw new BadRequestException('Paid order cannot change status');
      if (order.status === status) return order;

      await tx.order.update({ where: { id }, data: { status } });
      await tx.orderItem.updateMany({ where: { orderId: id }, data: { status } });

      return tx.order.findUniqueOrThrow({ where: { id }, include: { orderItems: true } });
    });
  }

  async updateOrderItemStatus(orderId: string, itemId: string, status: OrderStatus) {
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
}
