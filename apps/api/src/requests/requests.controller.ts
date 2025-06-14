import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Query,
  UseGuards,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  BadRequestException,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { Request } from '@prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('requests')
@Controller('requests')
@ApiBearerAuth()
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new waiter request' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Request created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Duplicate "Ready to pay" request',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @Body() createRequestDto: CreateRequestDto,
    @GetUser() user: any,
  ): Promise<Request> {
    // Ensure the userId in the DTO matches the authenticated user
    if (createRequestDto.userId && createRequestDto.userId !== user.id) {
      throw new BadRequestException('User ID in request does not match authenticated user');
    }
    
    // Set userId from authenticated user if not provided
    if (!createRequestDto.userId) {
      createRequestDto.userId = user.id;
    }

    return this.requestsService.create(createRequestDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get requests by user ID or table number' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter requests by user ID',
  })
  @ApiQuery({
    name: 'tableNumber',
    required: false,
    description: 'Filter requests by table number',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of requests',
    type: [Request],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async findAll(
    @Query('userId') userId?: string,
    @Query('tableNumber') tableNumber?: number,
    @GetUser() user?: any,
  ): Promise<Request[]> {
    // If userId is provided, use it (with authorization check)
    if (userId) {
      // Only allow users to see their own requests unless they have admin role
      if (userId !== user.id) {
        // In a real app, we would check for admin role here
        // For now, we'll just enforce users can only see their own requests
        return this.requestsService.findAllByUserId(user.id);
      }
      return this.requestsService.findAllByUserId(userId);
    }
    
    // If tableNumber is provided, use it
    if (tableNumber) {
      return this.requestsService.findAllByTableNumber(tableNumber);
    }
    
    // Default to current user's requests
    return this.requestsService.findAllByUserId(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a request by ID' })
  @ApiParam({
    name: 'id',
    description: 'Request ID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the request',
    type: Request,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Request not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async findOne(@Param('id') id: string): Promise<Request> {
    return this.requestsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a request' })
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
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Param('id') id: string,
    @Body() updateRequestDto: UpdateRequestDto,
    @GetUser() user: any,
  ): Promise<Request> {
    // Check if the request belongs to the authenticated user
    const request = await this.requestsService.findOne(id);
    
    if (request.userId !== user.id) {
      // In a real app with roles, we would check for admin/waiter role here
      // For now, we'll enforce that users can only update their own requests
      throw new BadRequestException('You can only update your own requests');
    }
    
    return this.requestsService.update(id, updateRequestDto);
  }
}
