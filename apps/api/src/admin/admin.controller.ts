import {
  Controller,
  Get,
  Post,
  Body,
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
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Public endpoint for tenant registration (no auth required)
  @Post('register-tenant')
  @ApiOperation({ summary: 'Register a new tenant with initial restaurant' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tenant and restaurant created successfully',
    schema: {
      type: 'object',
      properties: {
        tenant: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            status: { type: 'string' },
          },
        },
        restaurant: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            location: { type: 'string' },
            status: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Tenant or restaurant already exists',
  })
  async registerTenant(@Body() registerTenantDto: any) {
    return this.adminService.registerTenant(registerTenantDto);
  }

  @Get('metrics/summary')
  @ApiBearerAuth() // All other endpoints require JWT authentication
  @UseGuards(JwtAuthGuard, RolesGuard) // Apply JWT and Role guards
  @Roles('admin') // Restrict to admin role
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

  // Staff management has been moved to AdminStaffController
  // The route /admin/staff is now handled by AdminStaffController which supports restaurant filtering

    @Get('metrics/overview')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get restaurant overview for admin dashboard' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns restaurant overview',
    schema: {
      type: 'object',
      properties: {
        totalOrders: { type: 'number', example: 245 },
        completedOrders: { type: 'number', example: 187 },
        averageOrderValue: { type: 'number', example: 47.80 },
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
