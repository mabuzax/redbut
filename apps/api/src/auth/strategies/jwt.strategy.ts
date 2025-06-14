import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

/**
 * JWT authentication strategy for Passport
 * Validates JWT tokens and returns user information
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'super-secret-for-redbut-dev'),
    });
  }

  /**
   * Validate the JWT payload and return the user
   * @param payload JWT payload with user information
   * @returns User object to attach to the request
   */
  async validate(payload: any) {
    // ------------------------------------------------------------
    // Debug-level logs to trace JWT validation flow.
    // NOTE: these are temporary for local debugging; replace with
    // NestJS Logger or remove before production.
    // ------------------------------------------------------------
    console.log('[JWT] Raw payload received:', payload);

    const userId = payload.sub;
    console.log('[JWT] Extracted userId:', userId);

    const user = await this.authService.validateUser(userId);
    console.log('[JWT] User fetched from DB:', user);
    
    if (!user) {
      throw new UnauthorizedException('Invalid token or user not found');
    }
    
    return {
      id: user.id,
      tableNumber: user.tableNumber,
      sessionId: user.sessionId,
    };
  }
}
