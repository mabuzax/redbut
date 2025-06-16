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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/role.guard';
import { AdminStaffService } from './admin-staff.service';
import { 
  CreateStaffMemberDto, 
  UpdateStaffMemberDto, 
  StaffMemberResponseDto 
} from './admin-staff.dto';
import { STAFF_POSITIONS, StaffMemberWithAccessInfo } from './admin-staff.types';
import { Waiter } from '@prisma/client'; 

@ApiTags('admin-staff')
@Controller('admin/staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminStaffController {
  constructor(private readonly adminStaffService: AdminStaffService) {}

  @Get()
  @ApiOperation({ summary: 'Get all staff members' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all staff members retrieved successfully.',
    type: [StaffMemberResponseDto], 
  })
  async getAllStaffMembers(): Promise<StaffMemberWithAccessInfo[]> { 
    return this.adminStaffService.getAllStaffMembers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific staff member by ID' })
  @ApiParam({ name: 'id', description: 'Staff member ID (UUID)', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff member details retrieved successfully.',
    type: StaffMemberResponseDto, 
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Staff member not found.',
  })
  async getStaffMemberById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StaffMemberWithAccessInfo> {
    return this.adminStaffService.getStaffMemberById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new staff member' })
  @ApiBody({
    description: 'Data for creating a new staff member.',
    type: CreateStaffMemberDto, 
    examples: {
      waiter: {
        summary: 'Create a Waiter',
        value: {
          name: 'John',
          surname: 'Doe',
          email: 'john.doe@example.com',
          tag_nickname: 'JohnnyD',
          position: 'Waiter',
          phone: '1234567890',
          address: '123 Main St',
          password: 'Password123!',
        } as CreateStaffMemberDto, 
      },
      chef: {
        summary: 'Create a Chef',
        value: {
          name: 'Alice',
          surname: 'Smith',
          email: 'alice.smith@example.com',
          tag_nickname: 'ChefAlice',
          position: 'Chef',
          password: 'PasswordChef!',
        } as CreateStaffMemberDto,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Staff member created successfully.',
    type: StaffMemberResponseDto, 
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Staff member with this email or phone already exists.',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async createStaffMember(
    @Body() createStaffDto: CreateStaffMemberDto,
  ): Promise<Waiter> { 
    return this.adminStaffService.createStaffMember(createStaffDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing staff member' })
  @ApiParam({ name: 'id', description: 'Staff member ID (UUID)', type: String })
  @ApiBody({
    description: 'Data for updating an existing staff member. Email/username and password changes are not supported via this endpoint.',
    type: UpdateStaffMemberDto, 
     examples: {
      updateWaiter: {
        summary: 'Update Waiter Details',
        value: {
          name: 'Johnny',
          surname: 'Doer',
          tag_nickname: 'JD',
          position: 'Supervisor',
          phone: '0987654321',
        } as UpdateStaffMemberDto, 
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff member updated successfully.',
    type: StaffMemberResponseDto, 
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Staff member not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Staff member with this phone already exists.',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async updateStaffMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStaffDto: UpdateStaffMemberDto,
  ): Promise<Waiter> {
    return this.adminStaffService.updateStaffMember(id, updateStaffDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a staff member' })
  @ApiParam({ name: 'id', description: 'Staff member ID (UUID)', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Staff member deleted successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Staff member not found.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStaffMember(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.adminStaffService.deleteStaffMember(id);
  }
}
