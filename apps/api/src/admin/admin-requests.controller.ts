import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/role.guard';
import { AdminRequestsService } from './admin-requests.service';
import { RequestsService } from '../requests/requests.service';
import { UpdateRequestDto } from '../requests/dto/update-request.dto';
import { Request } from '@prisma/client';

@ApiTags('admin-requests')
@Controller('admin/requests')
@ApiBearerAuth() // All endpoints require JWT authentication
@UseGuards(JwtAuthGuard, RolesGuard) // Apply JWT and Role guards
@Roles('admin') // Restrict to admin role
export class AdminRequestsController {
  constructor(
    private readonly adminRequestsService: AdminRequestsService,
    private readonly requestsService: RequestsService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get summary of open and closed requests with average resolution time' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns open/closed counts and average resolution time',
    schema: {
      type: 'object',
      properties: {
        open: { type: 'number', example: 25 },
        closed: { type: 'number', example: 102 },
        avgResolutionTime: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getRequestsSummary() {
    return this.adminRequestsService.getRequestsSummary();
  }

  @Get('analytics/hourly')
  @ApiOperation({ summary: 'Get hourly request analytics for a specific date (7am to 2am next day)' })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date in YYYY-MM-DD format',
    type: String,
    example: '2025-06-15',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns hourly open/closed request counts for the specified date',
    schema: {
      type: 'object',
      properties: {
        date: { type: 'string', example: '2025-06-15' },
        hourly: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              hour: { type: 'number', example: 12 },
              open: { type: 'number', example: 5 },
              closed: { type: 'number', example: 8 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid date format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getHourlyRequestAnalytics(@Query('date') date: string) {
    return this.adminRequestsService.getHourlyRequestAnalytics(date);
  }

  @Get('time-ranges')
  @ApiOperation({ summary: 'Get requests grouped by time range (<10mins, 10-15mins, >15mins)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns request counts by time range',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          range: { type: 'string', example: '<10mins' },
          count: { type: 'number', example: 8 },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getRequestsByTimeRange() {
    return this.adminRequestsService.getRequestsByTimeRange();
  }

  /* ------------------------------------------------------------------ */
  /*  Requests Resolution Analytics (<10 / 10-15 / >15 mins)            */
  /* ------------------------------------------------------------------ */

  @Get('analytics/resolution')
  @ApiOperation({
    summary:
      'Get request-resolution analytics for a specific day (<10, 10-15, >15 mins)',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Calendar day in YYYY-MM-DD format',
    type: String,
    example: '2025-06-15',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Returns an array with request counts bucketed in the three resolution ranges',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          range: { type: 'string', example: '<10mins' },
          count: { type: 'number', example: 12 },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid date format',
  })
  async getResolutionAnalytics(@Query('date') date: string) {
    return this.adminRequestsService.getRequestsResolutionAnalytics(date);
  }

  @Get('analytics/busiest-time')
  @ApiOperation({ summary: 'Get the busiest hour for a specific date' })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date in YYYY-MM-DD format',
    type: String,
    example: '2025-06-15',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the hour with the most requests',
    schema: {
      type: 'object',
      properties: {
        hour: { type: 'number', example: 14 },
        label: { type: 'string', example: '14:00 - 15:00' },
        count: { type: 'number', example: 25 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid date format',
  })
  async getBusiestTime(@Query('date') date: string) {
    return this.adminRequestsService.getBusiestTime(date);
  }

  @Get('analytics/peak-time-requests')
  @ApiOperation({ summary: 'Get the total number of requests during peak time for a specific date' })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date in YYYY-MM-DD format',
    type: String,
    example: '2025-06-15',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the peak time and total requests count',
    schema: {
      type: 'object',
      properties: {
        peakTime: { type: 'string', example: '14:00 - 15:00' },
        totalRequests: { type: 'number', example: 25 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid date format',
  })
  async getPeakTimeRequests(@Query('date') date: string) {
    return this.adminRequestsService.getPeakTimeRequests(date);
  }

  @Get('analytics/waiter-performance')
  @ApiOperation({ summary: 'Get waiter performance ranking by average resolution time' })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date in YYYY-MM-DD format',
    type: String,
    example: '2025-06-15',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns waiter performance ranking from fastest to slowest',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          waiterId: { type: 'string' },
          waiterName: { type: 'string', example: 'John D.' },
          requestsHandled: { type: 'number', example: 15 },
          avgResolutionTime: { type: 'number', example: 8.5 },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid date format',
  })
  async getWaiterPerformance(@Query('date') date: string) {
    return this.adminRequestsService.getWaiterPerformance(date);
  }

  @Get()
  @ApiOperation({ summary: 'Get all requests with comprehensive filtering options' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by request status',
    type: String,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter by start date (YYYY-MM-DD)',
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter by end date (YYYY-MM-DD)',
    type: String,
  })
  @ApiQuery({
    name: 'waiterId',
    required: false,
    description: 'Filter by waiter ID',
    type: String,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in request content',
    type: String,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort by field',
    enum: ['createdAt', 'status', 'tableNumber'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Page size',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns filtered list of requests',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tableNumber: { type: 'number' },
          content: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          waiterId: { type: 'string', nullable: true },
          waiterName: { type: 'string', nullable: true },
          responseTime: { type: 'number', nullable: true },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getAllRequests(
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('waiterId') waiterId?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: 'createdAt' | 'status' | 'tableNumber',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    return this.adminRequestsService.getAllRequests({
      status,
      startDate,
      endDate,
      waiterId,
      search,
      sort,
      page,
      pageSize,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a request (admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Request ID',
    required: true,
  })
  @ApiBody({ type: UpdateRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request updated successfully',
    type: Request,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition or request data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Request not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateRequest(
    @Param('id') id: string,
    @Body() updateRequestDto: UpdateRequestDto,
  ): Promise<Request> {
    return this.requestsService.update(id, updateRequestDto, 'admin');
  }
}
