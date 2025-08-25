import { Controller, Get, Query, UseGuards, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestStatusConfigService } from '../common/request-status-config.service';
import { RequestStatus } from '@prisma/client';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

class GetTransitionsQueryDto {
  @IsEnum(RequestStatus, { message: 'Invalid status value' })
  @IsNotEmpty()
  currentStatus: RequestStatus;

  @IsString()
  @IsNotEmpty()
  userRole: string;
}

@ApiTags('request-status-config')
@ApiBearerAuth()
@Controller('api/v1/request-status-config')
@UseGuards(JwtAuthGuard)
export class RequestStatusConfigController {
  private readonly logger = new Logger(RequestStatusConfigController.name);

  constructor(
    private readonly requestStatusConfigService: RequestStatusConfigService,
  ) {}

  @Get('transitions')
  @ApiOperation({ summary: 'Get allowed status transitions for a role and current status' })
  @ApiQuery({ name: 'currentStatus', enum: RequestStatus, required: true })
  @ApiQuery({ name: 'userRole', required: true })
  @ApiResponse({
    status: 200,
    description: 'List of allowed status transitions',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          targetStatus: { type: 'string', enum: Object.values(RequestStatus) },
          label: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTransitions(
    @Query() query: GetTransitionsQueryDto,
  ) {
    try {
      this.logger.debug(`Getting transitions for status: ${query.currentStatus}, role: ${query.userRole}`);
      
      const transitions = await this.requestStatusConfigService.getAllowedTransitions(
        query.currentStatus,
        query.userRole,
      );
      
      return {
        currentStatus: query.currentStatus,
        userRole: query.userRole,
        transitions,
      };
    } catch (error) {
      this.logger.error(`Error getting transitions: ${error.message}`);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Failed to retrieve status transitions');
    }
  }
}
