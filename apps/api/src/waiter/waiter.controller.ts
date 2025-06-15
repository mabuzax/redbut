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
import { RequestStatus } from '@prisma/client'; // Import RequestStatus from Prisma client
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

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
    enum: [...Object.values(RequestStatus), 'all'],
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
    @Query('page',     new DefaultValuePipe(1),  ParseIntPipe) page     = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
    @Query('status') status?: string,
    @Query('sort') sort?: 'time' | 'status',
    @Query('search') search?: string,
  ): Promise<any[]> {
    return this.waiterService.getAllRequests({
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
    description: 'Returns an array of active requests',
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
  async getActiveRequests(): Promise<any[]> {
    return this.waiterService.getActiveRequests();
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

  @Get('requests/summary')
  @Roles('waiter')
  @ApiOperation({ summary: 'Get a summary of open and closed requests' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns counts of open and closed requests',
    schema: {
      type: 'object',
      properties: {
        open: { type: 'number', example: 3 },
        closed: { type: 'number', example: 4 },
      },
    },
  })
  async getRequestsSummary(): Promise<{ open: number; closed: number }> {
    return this.waiterService.getRequestsSummary();
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
    description: 'Returns AI analysis text',
    schema: {
      type: 'object',
      properties: {
        analysis: { type: 'string', example: 'Based on current data, your performance today is excellent!' },
      },
    },
  })
  async getAIAnalysis(): Promise<{ analysis: string }> {
    const analysis = await this.waiterService.getAIAnalysis();
    return { analysis };
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
}
