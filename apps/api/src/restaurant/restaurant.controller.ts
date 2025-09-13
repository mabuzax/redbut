import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/role.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RestaurantService, CreateRestaurantDto, UpdateRestaurantDto, ActivateRestaurantDto } from './restaurant.service';

@ApiTags('restaurants')
@Controller('restaurants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get all restaurants with subscription status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of restaurants with their subscription details',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          location: { type: 'string' },
          address: { type: 'string' },
          status: { type: 'string', enum: ['Active', 'Inactive'] },
          subscription: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              activeUntil: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getAllRestaurants(@TenantId() tenantId: string) {
    return await this.restaurantService.getAllRestaurants(tenantId);
  }

  @Get(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get restaurant by ID with subscription details' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Restaurant details with subscription information',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Restaurant not found',
  })
  async getRestaurantById(@Param('id') id: string, @TenantId() tenantId: string) {
    return await this.restaurantService.getRestaurantById(id, tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new restaurant' })
  @ApiBody({
    description: 'Restaurant creation data',
    schema: {
      type: 'object',
      required: ['name', 'tenantId'],
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string', format: 'email' },
        location: { type: 'string' },
        address: { type: 'string' },
        tenantId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Restaurant created successfully with inactive status',
  })
  async createRestaurant(@Body() createRestaurantDto: CreateRestaurantDto) {
    return await this.restaurantService.createRestaurant(createRestaurantDto);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update restaurant details' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiBody({
    description: 'Restaurant update data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string', format: 'email' },
        location: { type: 'string' },
        address: { type: 'string' },
        status: { type: 'string', enum: ['Active', 'Inactive'] },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Restaurant updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Restaurant not found',
  })
  async updateRestaurant(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    return await this.restaurantService.updateRestaurant(id, tenantId, updateRestaurantDto);
  }

  @Post(':id/activate')
  @Roles('admin', 'billing')
  @ApiOperation({ summary: 'Activate restaurant subscription' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiBody({
    description: 'Activation plan data',
    schema: {
      type: 'object',
      required: ['months'],
      properties: {
        months: { 
          type: 'number', 
          description: 'Number of months to activate (1, 3, 6, or 12)',
          enum: [1, 3, 6, 12]
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Restaurant subscription activated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Restaurant not found',
  })
  async activateRestaurant(
    @Param('id') restaurantId: string,
    @TenantId() tenantId: string,
    @Body() body: { months: number },
  ) {
    const activateDto: ActivateRestaurantDto = {
      restaurantId,
      months: body.months,
    };
    return await this.restaurantService.activateRestaurant(activateDto, tenantId);
  }

  @Patch(':id/deactivate')
  @Roles('admin')
  @ApiOperation({ summary: 'Deactivate restaurant (soft delete)' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Restaurant deactivated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Restaurant not found',
  })
  async deactivateRestaurant(@Param('id') id: string) {
    return await this.restaurantService.deactivateRestaurant(id);
  }

  @Get(':id/subscription')
  @Roles('admin', 'manager', 'billing')
  @ApiOperation({ summary: 'Get restaurant subscription details' })
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Restaurant subscription details',
  })
  async getRestaurantSubscription(@Param('id') restaurantId: string) {
    return await this.restaurantService.getRestaurantSubscription(restaurantId);
  }

  @Get('expiring/soon')
  @Roles('admin', 'billing')
  @ApiOperation({ summary: 'Get restaurants expiring within 7 days' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of restaurants expiring soon',
  })
  async getExpiringSoon() {
    return await this.restaurantService.getExpiringSoon();
  }
}
