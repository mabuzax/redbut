import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  ParseIntPipe,
  Delete,
  BadRequestException,
  Put,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Order, OrderStatus } from '@prisma/client';
import { IsEnum, IsString, IsNotEmpty, IsInt } from 'class-validator';

class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'Invalid order status' })
  status: OrderStatus;
}

class RejectOrderDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsInt()
  tableNumber: number;
}

@ApiTags('orders')
@Controller('orders')
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get orders for the authenticated user session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns order information for the user session',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              tableNumber: { type: 'number' },
              sessionId: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              orderItems: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    quantity: { type: 'number' },
                    price: { type: 'number' },
                    status: { type: 'string' },
                    menuItem: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        image: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        total: { type: 'number' },
        tableNumber: { type: 'number' },
        sessionId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async getMyOrders(
    @GetUser() user: any,
  ): Promise<{
    items: Order[];
    total: number;
    tableNumber: number;
    sessionId?: string;
  }> {
    // Use the authenticated user's session information
    const { tableNumber, sessionId } = user;
    
    if (!tableNumber || !sessionId) {
      throw new BadRequestException('User session information not found');
    }

    return this.ordersService.calculateBill(tableNumber, sessionId);
  }

  @Get('table/:tableNumber')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get orders for a specific table (staff only)' })
  @ApiParam({
    name: 'tableNumber',
    required: true,
    description: 'Table number to get orders for',
    type: Number,
  })
  @ApiQuery({
    name: 'sessionId',
    required: false,
    description: 'Optional session ID to filter orders',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns order information for the specified table',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access - staff only',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid table number',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getOrdersByTable(
    @Param('tableNumber', ParseIntPipe) tableNumber: number,
    @GetUser() user: any,
    @Query('sessionId') sessionId?: string,
  ): Promise<{
    items: Order[];
    total: number;
    tableNumber: number;
    sessionId?: string;
  }> {
    // Only allow staff (waiter/admin) to access orders by table number
    if (!user.role || (user.role !== 'waiter' && user.role !== 'admin')) {
      throw new BadRequestException('Access denied: Staff access required');
    }

    if (!tableNumber || isNaN(tableNumber) || tableNumber < 1) {
      throw new BadRequestException('Valid table number is required');
    }

    return this.ordersService.calculateBill(tableNumber, sessionId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new order item' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Order created successfully',
    schema: { $ref: '#/components/schemas/Order' },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid order data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    return this.ordersService.create(createOrderDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the order',
    schema: { $ref: '#/components/schemas/Order' },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async findOne(@Param('id') id: string): Promise<Order> {
    return this.ordersService.findOne(id);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update order status and all its items' })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    required: true,
  })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order status updated successfully',
    schema: { $ref: '#/components/schemas/Order' },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    return this.ordersService.updateOrderStatus(id, updateStatusDto.status);
  }

  @Put(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reject order with reason and notify waiter' })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    required: true,
  })
  @ApiBody({ type: RejectOrderDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order rejected and waiter notified',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or order cannot be rejected',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async rejectOrder(
    @Param('id') id: string,
    @Body() rejectOrderDto: RejectOrderDto,
    @GetUser() user: any,
  ): Promise<{ message: string }> {
    return this.ordersService.rejectOrderWithReason(
      id,
      rejectOrderDto.reason,
      rejectOrderDto.tableNumber,
      user.id
    );
  }

  @Put(':id/items/:itemId/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update individual order item status' })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    required: true,
  })
  @ApiParam({
    name: 'itemId',
    description: 'Order Item ID',
    required: true,
  })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order item status updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order or item not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateItemStatus(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ): Promise<any> {
    return this.ordersService.updateOrderItemStatus(id, itemId, updateStatusDto.status);
  }

  @Patch(':id/items/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update order item details (quantity, options, etc.)' })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    required: true,
  })
  @ApiParam({
    name: 'itemId',
    description: 'Order Item ID',
    required: true,
  })
  @ApiBody({ type: UpdateOrderItemDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order item updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order or item not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid update data or order cannot be modified',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateOrderItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateOrderItemDto: UpdateOrderItemDto,
    @GetUser() user: any,
  ): Promise<any> {
    return this.ordersService.updateOrderItem(id, itemId, updateOrderItemDto, user.userId);
  }

  @Get(':id/can-modify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if order can be modified' })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns whether order can be modified',
    schema: {
      type: 'object',
      properties: {
        canModify: { type: 'boolean' },
        reason: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  async canModifyOrder(@Param('id') id: string): Promise<{ canModify: boolean; reason?: string }> {
    return this.ordersService.canModifyOrder(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete an order' })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order deleted successfully',
    schema: { $ref: '#/components/schemas/Order' },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async remove(@Param('id') id: string): Promise<Order> {
    return this.ordersService.remove(id);
  }

  @Delete('table/:tableNumber')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Clear all orders for a table' })
  @ApiParam({
    name: 'tableNumber',
    description: 'Table number',
    required: true,
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Orders cleared successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid table number',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async clearTableOrders(
    @Param('tableNumber', ParseIntPipe) tableNumber: number,
  ): Promise<{ count: number }> {
    if (!tableNumber || isNaN(tableNumber) || tableNumber < 1) {
      throw new BadRequestException('Valid table number is required');
    }

    return this.ordersService.clearTableOrders(tableNumber);
  }
}
