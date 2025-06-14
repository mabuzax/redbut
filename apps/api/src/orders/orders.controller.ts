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
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Order } from '@prisma/client';

@ApiTags('orders')
@Controller('orders')
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get bill information for a table and optional session' })
  @ApiQuery({
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
    description: 'Returns bill information with items and total',
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
              item: { type: 'string' },
              price: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
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
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid table number',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getBill(
    @Query('tableNumber', ParseIntPipe) tableNumber: number,
    @Query('sessionId') sessionId?: string,
  ): Promise<{
    items: Order[];
    total: number;
    tableNumber: number;
    sessionId?: string;
  }> {
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
