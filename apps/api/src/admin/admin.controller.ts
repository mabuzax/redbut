import {
  Controller,
  Get,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/role.guard';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
@ApiBearerAuth() // All endpoints require JWT authentication
@UseGuards(JwtAuthGuard, RolesGuard) // Apply JWT and Role guards
@Roles('admin') // Restrict to admin role
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics/summary')
  @ApiOperation({ summary: 'Get restaurant metrics summary for admin dashboard' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns restaurant metrics',
    schema: {
      type: 'object',
      properties: {
        totalTables: { type: 'number', example: 24 },
        occupiedTables: { type: 'number', example: 18 },
        totalRequests: { type: 'number', example: 156 },
        openRequests: { type: 'number', example: 12 },
        averageResponseTime: { type: 'number', example: 3.5 },
        dailyRevenue: { type: 'number', example: 8750.50 },
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
  async getRestaurantMetrics() {
    return this.adminService.getRestaurantMetrics();
  }

  @Get('staff')
  @ApiOperation({ summary: 'Get all staff members (waiters)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of staff members with performance metrics',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          name: { type: 'string' },
          surname: { type: 'string' },
          tag_nickname: { type: 'string' },
          userType: { type: 'string', enum: ['WAITER', 'ADMIN', 'MANAGER'] },
          propic: { type: 'string', nullable: true },
          requestsHandled: { type: 'number' },
          averageRating: { type: 'string' }, // String because it's formatted to 1 decimal place
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
  async getStaffMembers() {
    return this.adminService.getStaffMembers();
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get restaurant overview data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns restaurant overview statistics',
    schema: {
      type: 'object',
      properties: {
        totalCustomers: { type: 'number', example: 2500 },
        totalOrders: { type: 'number', example: 12500 },
        totalRevenue: { type: 'number', example: 125000 },
        averageSatisfaction: { type: 'number', example: 4.7 },
        popularItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              count: { type: 'number' },
            },
          },
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
  async getRestaurantOverview() {
    return this.adminService.getRestaurantOverview();
  }
}
