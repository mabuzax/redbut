import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  ParseIntPipe,
  Post,
  HttpCode,
  HttpException,
  DefaultValuePipe,
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
import { WaiterService } from './waiter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/role.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RequestStatus } from '@prisma/client'; // Import RequestStatus from Prisma client
import { OrderStatus } from '@prisma/client';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { IsEnum } from 'class-validator';

/**
 * DTO used for submitting a waiter rating from the client app.
 * All star-fields are required and must be integers 1-5.
 */
class WaiterRatingDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  waiterId!: string;

  @IsInt() @Min(1) @Max(5)
  friendliness!: number;

  @IsInt() @Min(1) @Max(5)
  orderAccuracy!: number;

  @IsInt() @Min(1) @Max(5)
  speed!: number;

  @IsInt() @Min(1) @Max(5)
  attentiveness!: number;

  @IsInt() @Min(1) @Max(5)
  knowledge!: number;

  @IsOptional()
  @IsString()
  comment?: string | null;
}

class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

@ApiTags('waiter')
@Controller('waiter')
@ApiBearerAuth() // All endpoints in this controller require JWT authentication
// Apply JWT guard and Role guard to all routes in this controller
@UseGuards(JwtAuthGuard, RolesGuard)
export class WaiterController {
  constructor(private readonly waiterService: WaiterService) {}

  /* ---------------------------------------------------------------------
   *  GET /waiter/requests
   * ------------------------------------------------------------------- */
  @Get('requests')
  @Roles('waiter')
  @ApiOperation({ summary: 'Get all requests for the waiter view (with filters)' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (New, Acknowledged, InProgress, Completed, OnHold, Cancelled, Done)',
    enum: [...Object.values(RequestStatus) as string[], 'all'],
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort by "time" (default, newest first) or "status"',
    enum: ['time', 'status'],
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Full-text search in request content',
    type: String,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a filtered / paginated list of requests',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tableNumber: { type: 'number' },
          content: { type: 'string' },
          status: { type: 'string', enum: Object.values(RequestStatus) },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getAllRequests(
    @GetUser() user: any,
    @Query('page',     new DefaultValuePipe(1),  ParseIntPipe) page     = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
    @Query('status') status?: string,
    @Query('sort') sort?: 'time' | 'status',
    @Query('search') search?: string,
  ): Promise<any[]> {
    return this.waiterService.getAllRequests(user.id, {
      status,
      sort,
      search,
      page,
      pageSize,
    });
  }

  @Get('requests/active')
  @Roles('waiter')
  @ApiOperation({ summary: 'Get a list of active requests for the waiter dashboard' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns an array of active requests for waiter allocated tables',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tableNumber: { type: 'number' },
          content: { type: 'string', description: 'First 50 characters of the request content' },
          status: { type: 'string', enum: Object.values(RequestStatus) },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getActiveRequests(@GetUser() user: any): Promise<any[]> {
    return this.waiterService.getActiveRequests(user.id);
  }

  @Put('requests/:id/status')
  @Roles('waiter')
  @ApiOperation({ summary: 'Update the status of a specific request' })
  @ApiParam({ name: 'id', description: 'The ID of the request to update', required: true })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['Acknowledged', 'InProgress', 'Completed'],
          description: 'The new status for the request',
        },
      },
      required: ['status'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request status updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        tableNumber: { type: 'number' },
        content: { type: 'string' },
        status: { type: 'string', enum: Object.values(RequestStatus) },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Request not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid status transition or data' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateRequestStatus(
    @Param('id') id: string,
    @Body('status') newStatus: 'Acknowledged' | 'InProgress' | 'Completed',
  ): Promise<any> {
    return this.waiterService.updateRequestStatus(id, newStatus);
  }

  @Get('orders')
  @Roles('waiter')
  @ApiOperation({ summary: 'Get all orders for allocated tables' })
  @ApiQuery({ name: 'status', required: false, enum: [...Object.values(OrderStatus) as string[], 'all'] })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  async getOrders(
    @GetUser() user: any,
    @Query('page',     new DefaultValuePipe(1),  ParseIntPipe) page     = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
    @Query('status') status?: string,
  ): Promise<any> {
    return this.waiterService.getOrders(user.id, { page, pageSize, status });
  }

  @Get('orders/by-table')
  @Roles('waiter')
  @ApiOperation({ summary: 'Get orders grouped by table' })
  async getOrdersByTable(@GetUser() user: any): Promise<any> {
    return this.waiterService.getOrdersByTable(user.id);
  }

  @Put('orders/:id/status')
  @Roles('waiter')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', required: true, description: 'Order ID' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.waiterService.updateOrderStatus(id, dto.status);
  }

  @Get('orders/session/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('waiter')
  @ApiOperation({ summary: 'Get orders for a specific session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to get orders for' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getOrdersBySession(
    @GetUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.waiterService.getOrdersBySession(user.id, sessionId);
  }

  @Get('requests/session/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('waiter')
  @ApiOperation({ summary: 'Get requests for a specific session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to get requests for' })
  @ApiResponse({ status: 200, description: 'Requests retrieved successfully' })
  async getRequestsBySession(
    @GetUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.waiterService.getRequestsBySession(user.id, sessionId);
  }

  @Get('requests/summary')
  @Roles('waiter')
  @ApiOperation({ summary: 'Get a summary of open and closed requests for this waiter' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns counts of open and closed requests for waiter sessions',
    schema: {
      type: 'object',
      properties: {
        open: { type: 'number', example: 3 },
        closed: { type: 'number', example: 4 },
      },
    },
  })
  async getRequestsSummary(@GetUser() user: any): Promise<{ open: number; closed: number }> {
    return this.waiterService.getRequestsSummary(user.id);
  }

  @Get('reviews/summary')
  @Roles('waiter')
  @ApiOperation({ summary: 'Get a summary of reviews (average rating and total count)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns average rating and total reviews',
    schema: {
      type: 'object',
      properties: {
        averageRating: { type: 'number', format: 'float', example: 4.5 },
        totalReviews: { type: 'number', example: 552 },
      },
    },
  })
  async getReviewsSummary(): Promise<{ averageRating: number; totalReviews: number }> {
    return this.waiterService.getReviewsSummary();
  }

  @Get('reviews')
  @Roles('waiter')
  @ApiOperation({ summary: 'Get a paginated list of reviews' })
  @ApiQuery({ name: 'page', description: 'Page number', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', description: 'Number of reviews per page', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a paginated list of reviews',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          rating: { type: 'number' },
          content: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getPaginatedReviews(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ): Promise<any[]> {
    return this.waiterService.getPaginatedReviews(page, pageSize);
  }

  @Get('ai/performance-today')
  @Roles('waiter')
  @ApiOperation({ summary: 'Get AI analysis of waiter performance for today' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns structured AI analysis',
    schema: {
      type: 'object',
      properties: {
        customerSentiment: { type: 'string', example: 'Overall Positive' },
        happinessBreakdown: {
          type: 'object',
          properties: {
            'Extremely Happy': { type: 'string' },
            'Very Happy': { type: 'string' },
            'Just Ok': { type: 'string' },
            'Unhappy': { type: 'string' },
            'Horrible': { type: 'string' },
          }
        },
        improvementPoints: { type: 'array', items: { type: 'string' } },
        overallAnalysis: { type: 'string' },
      },
    },
  })
  async getAIAnalysis(@GetUser() user: any): Promise<any> {
    const analysis = await this.waiterService.getAIAnalysis(user.id);
    return analysis;
  }

  /* ---------------------------------------------------------------------
   *  POST /waiter/ratings  – submit a waiter rating from client section
   * ------------------------------------------------------------------- */
  @Post('ratings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a rating for a waiter' })
  @ApiBody({
    description: 'Waiter rating payload',
    type: WaiterRatingDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Rating stored successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createRating(@Body() dto: WaiterRatingDto) {
    try {
      return await this.waiterService.createRating(dto);
    } catch (e) {
      throw new HttpException(
        (e as Error).message || 'Failed to store rating',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Session Management Endpoints                                               */
  /* -------------------------------------------------------------------------- */

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('waiter', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all waiters' })
  @ApiResponse({ status: 200, description: 'List of all waiters' })
  async getAllWaiters() {
    return this.waiterService.getAllWaiters();
  }

  @Post('create-session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('waiter', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a table session' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tableNumber: { type: 'number' },
        waiterId: { type: 'string' },
        sessionId: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async createSession(@Body() dto: { tableNumber: number; waiterId: string; sessionId: string }) {
    try {
      return await this.waiterService.createSession(dto.tableNumber, dto.waiterId, dto.sessionId);
    } catch (e) {
      throw new HttpException(
        (e as Error).message || 'Failed to create session',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('active-sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('waiter', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active table sessions' })
  @ApiResponse({ status: 200, description: 'Active sessions retrieved successfully' })
  async getActiveSessions() {
    try {
      return await this.waiterService.getActiveSessions();
    } catch (e) {
      throw new HttpException(
        (e as Error).message || 'Failed to retrieve active sessions',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('sessions/:waiterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('waiter', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active sessions for a specific waiter' })
  @ApiParam({ name: 'waiterId', description: 'The waiter ID to get sessions for' })
  @ApiResponse({ status: 200, description: 'Waiter sessions retrieved successfully' })
  async getSessionsByWaiterId(@Param('waiterId') waiterId: string) {
    try {
      return await this.waiterService.getSessionsByWaiterId(waiterId);
    } catch (e) {
      throw new HttpException(
        (e as Error).message || 'Failed to retrieve waiter sessions',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('close-session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('waiter', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close a table session' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Session closed successfully' })
  async closeSession(@Body() dto: { sessionId: string }) {
    try {
      return await this.waiterService.closeSession(dto.sessionId);
    } catch (e) {
      throw new HttpException(
        (e as Error).message || 'Failed to close session',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
