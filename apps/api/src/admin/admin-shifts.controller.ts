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
import { AdminShiftsService } from './admin-shifts.service';
import {
  CreateShiftDto,
  UpdateShiftDto,
  ShiftResponseDto,
} from './admin-shifts.dto';
import { ShiftWithStaffInfo } from './admin-shifts.types';

@ApiTags('admin-shifts')
@Controller('admin/shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminShiftsController {
  constructor(private readonly adminShiftsService: AdminShiftsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all shifts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all shifts retrieved successfully.',
    type: [ShiftResponseDto],
  })
  async getAllShifts(): Promise<ShiftWithStaffInfo[]> {
    return this.adminShiftsService.getAllShifts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific shift by ID' })
  @ApiParam({ name: 'id', description: 'Shift ID (UUID)', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Shift details retrieved successfully.',
    type: ShiftResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Shift not found.',
  })
  async getShiftById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ShiftWithStaffInfo> {
    return this.adminShiftsService.getShiftById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new shift' })
  @ApiBody({
    description: 'Data for creating a new shift.',
    type: CreateShiftDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Shift created successfully.',
    type: ShiftResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async createShift(
    @Body() createShiftDto: CreateShiftDto,
  ): Promise<ShiftWithStaffInfo> {
    return this.adminShiftsService.createShift(createShiftDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing shift' })
  @ApiParam({ name: 'id', description: 'Shift ID (UUID)', type: String })
  @ApiBody({
    description: 'Data for updating an existing shift.',
    type: UpdateShiftDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Shift updated successfully.',
    type: ShiftResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Shift not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async updateShift(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateShiftDto: UpdateShiftDto,
  ): Promise<ShiftWithStaffInfo> {
    return this.adminShiftsService.updateShift(id, updateShiftDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shift' })
  @ApiParam({ name: 'id', description: 'Shift ID (UUID)', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Shift deleted successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Shift not found.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShift(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.adminShiftsService.deleteShift(id);
  }
}
