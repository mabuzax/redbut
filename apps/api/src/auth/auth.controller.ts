import {
  Controller,
  Post,
  Get,
  Body,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateAnonymousSessionDto } from './dto/create-anonymous-session.dto';
import { AnonymousSessionResponseDto } from './dto/anonymous-session-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('anon')
  @ApiOperation({ summary: 'Create an anonymous user session' })
  @ApiBody({ type: CreateAnonymousSessionDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Anonymous session created successfully',
    type: AnonymousSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid table number',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createAnonymousSession(
    @Body() createSessionDto: CreateAnonymousSessionDto,
  ): Promise<AnonymousSessionResponseDto> {
    const { tableNumber } = createSessionDto;
    const { user, token } = await this.authService.createAnonymousSession(tableNumber);
    
    return {
      userId: user.id,
      tableNumber: user.tableNumber,
      sessionId: user.sessionId!,
      token,
    };
  }

  /* ------------------------------------------------------------------
   *  GET /auth/verify
   *  Simple endpoint to validate the JWT and return user info.
   * ------------------------------------------------------------------ */

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify JWT token and return authenticated user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token is valid; returns user info attached to the request',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing token',
  })
  verifyToken(@Req() req: any) {
    // JwtAuthGuard attaches the validated user to req.user
    return req.user;
  }
}
