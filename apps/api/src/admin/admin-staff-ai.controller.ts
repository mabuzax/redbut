import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/role.guard';
import { AdminStaffAiService } from './admin-staff-ai.service';
import { IsString, IsNotEmpty } from 'class-validator';
import { StaffMemberResponseDto } from './admin-staff.dto';

class AiQueryDto {
  @ApiProperty({ description: 'The user message or query for the AI assistant related to staff management.' , example: "Create a new waiter named John Doe, email john.doe@example.com, tag JohnnyD, position Waiter"})
  @IsString()
  @IsNotEmpty()
  message: string;
}

@ApiTags('admin-staff-ai')
@Controller('admin/staff/ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminStaffAiController {
  private readonly logger = new Logger(AdminStaffAiController.name);

  constructor(private readonly adminStaffAiService: AdminStaffAiService) {}

  @Post('query')
  @ApiOperation({ summary: 'Process an AI query related to staff management' })
  @ApiBody({ type: AiQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI response to the query. The response structure varies based on the AI action.',
    schema: {
      oneOf: [
        { type: 'string', example: 'Staff member John Doe created successfully.' },
        { $ref: '#/components/schemas/StaffMemberResponseDto' },
        { type: 'array', items: { $ref: '#/components/schemas/StaffMemberResponseDto' } },
        { type: 'object', properties: { message: { type: 'string', example: "Staff member with ID xyz has been deleted."} } },
        { type: 'array', items: { type: 'string' }, example: ["Waiter", "Chef", "Manager"] },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or AI processing error.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions.',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async processStaffQuery(@Body() queryDto: AiQueryDto) {
    this.logger.log(`Received AI staff query: "${queryDto.message}"`);
    try {
      const response = await this.adminStaffAiService.processStaffQuery(queryDto.message);
      return response;
    } catch (error) {
      this.logger.error(`Error processing AI staff query: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to process AI staff query',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
