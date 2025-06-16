import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/role.guard';
import { AdminMenuService, CreateMenuItemDto, UpdateMenuItemDto, MenuItemUploadData } from './admin-menu.service';

@ApiTags('admin-menu')
@Controller('admin/menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminMenuController {
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

  @Post()
  @ApiOperation({ summary: 'Create a new menu item' })
  // @ApiBody({ type: CreateMenuItemDto }) // Removed as CreateMenuItemDto is an interface
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Menu item created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async createMenuItem(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.adminMenuService.createMenuItem(createMenuItemDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID', type: String })
  // @ApiBody({ type: UpdateMenuItemDto }) // Removed as UpdateMenuItemDto is an interface
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Menu item updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Menu item not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async updateMenuItem(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.adminMenuService.updateMenuItem(id, updateMenuItemDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a menu item' })
  @ApiParam({ name: 'id', description: 'Menu item ID', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT, 
    description: 'Menu item deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Menu item not found',
  })
  async deleteMenuItem(@Param('id') id: string) {
    await this.adminMenuService.deleteMenuItem(id);
  }

  @Post('bulk-upload')
  @ApiOperation({ summary: 'Bulk upload menu items from XLSX file (frontend processes file)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'XLSX file containing menu items. This endpoint is a placeholder; frontend should send processed JSON to /bulk-upload-json.',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED, 
    description: 'File received, frontend should process and send JSON to /bulk-upload-json',
  })
  @UseInterceptors(FileInterceptor('file'))
  async bulkUploadMenuItems(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return { message: 'File received. Frontend should process and send JSON to /bulk-upload-json.' };
  }

  @Post('bulk-upload-json')
  @ApiOperation({ summary: 'Bulk upload menu items from processed JSON data' })
  @ApiBody({
    description: 'JSON array of menu items to upload',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object', 
            properties: {
              category: { type: 'string', nullable: true },
              name: { type: 'string' },
              description: { type: 'string', nullable: true },
              image: { type: 'string', nullable: true },
              price: { type: 'number' },
              status: { type: 'string', nullable: true },
              video: { type: 'string', nullable: true },
              served_info: { type: 'string', nullable: true },
              available_options: { type: 'object', nullable: true }, 
              available_extras: { type: 'object', nullable: true }, 
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk upload completed',
    schema: {
      type: 'object',
      properties: {
        created: { type: 'number' },
        failed: { type: 'number' },
      },
    },
  })
  async bulkUploadMenuItemsFromJson(@Body() data: { items: MenuItemUploadData[] }) {
    return this.adminMenuService.bulkUploadMenuItems(data.items);
  }
}
