import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
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
import { AdminTableAllocationsService } from './admin-table-allocations.service';
import {
  CreateTableAllocationDto,
  UpdateTableAllocationDto,
  TableAllocationResponseDto,
} from './admin-table-allocations.dto';
import { TableAllocationWithDetails } from './admin-table-allocations.types';

@ApiTags('admin-table-allocations')
@Controller('admin/table-allocations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminTableAllocationsController {
  constructor(
    private readonly adminTableAllocationsService: AdminTableAllocationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all table allocations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all table allocations retrieved successfully.',
    type: [TableAllocationResponseDto],
  })
  async getAllTableAllocations(): Promise<TableAllocationWithDetails[]> {
    return this.adminTableAllocationsService.getAllTableAllocations();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific table allocation by ID' })
  @ApiParam({ name: 'id', description: 'Table allocation ID (UUID)', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Table allocation details retrieved successfully.',
    type: TableAllocationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Table allocation not found.',
  })
  async getTableAllocationById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TableAllocationWithDetails> {
    return this.adminTableAllocationsService.getTableAllocationById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new table allocation' })
  @ApiBody({
    description: 'Data for creating a new table allocation.',
    type: CreateTableAllocationDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Table allocation created successfully.',
    type: TableAllocationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data (e.g., shift or waiter not found, invalid table numbers).',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Table conflict detected for the given shift or waiter already has an allocation for this shift.',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async createTableAllocation(
    @Body() createTableAllocationDto: CreateTableAllocationDto,
  ): Promise<TableAllocationWithDetails> {
    return this.adminTableAllocationsService.createTableAllocation(
      createTableAllocationDto,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing table allocation' })
  @ApiParam({ name: 'id', description: 'Table allocation ID (UUID)', type: String })
  @ApiBody({
    description: 'Data for updating an existing table allocation. All fields are optional.',
    type: UpdateTableAllocationDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Table allocation updated successfully.',
    type: TableAllocationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Table allocation not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data (e.g., shift or waiter not found).',
  })
   @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Table conflict detected for the given shift.',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async updateTableAllocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTableAllocationDto: UpdateTableAllocationDto,
  ): Promise<TableAllocationWithDetails> {
    return this.adminTableAllocationsService.updateTableAllocation(
      id,
      updateTableAllocationDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a table allocation' })
  @ApiParam({ name: 'id', description: 'Table allocation ID (UUID)', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Table allocation deleted successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Table allocation not found.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTableAllocation(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.adminTableAllocationsService.deleteTableAllocation(id);
  }
}
