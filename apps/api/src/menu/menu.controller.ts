import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AdminMenuService } from '../admin/admin-menu.service';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly adminMenuService: AdminMenuService) {}

  @Get()
  @ApiOperation({ summary: 'Get all menu items with filtering and pagination' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in name and description' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Items per page', type: Number, example: 20 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Menu items retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'object' }, 
        },
        total: { type: 'number' },
        page: { type: 'number' },
        pageSize: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getAllMenuItems(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    return this.adminMenuService.getAllMenuItems({
      category,
      status,
      search,
      page,
      pageSize,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all available categories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  async getCategories() {
    return this.adminMenuService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu item by ID' })
  @ApiParam({ name: 'id', description: 'Menu item ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Menu item retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Menu item not found',
  })
  async getMenuItemById(@Param('id') id: string) {
    return this.adminMenuService.getMenuItemById(id);
  }
}
