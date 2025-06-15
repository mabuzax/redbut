import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../common/prisma.service';

/**
 * JWT authentication strategy for Passport
 * Validates JWT tokens and returns user information
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
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
    const { sub: userId, role } = payload;

    if (role === 'waiter') {
      const waiter = await this.validateWaiter(userId);
      return {
        id: waiter.id,
        role: 'waiter',
        name: `${waiter.name} ${waiter.surname}`,
      };
    }

    // Default flow for anonymous web users
    const user = await this.authService.validateUser(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid token or user not found');
    }

    return {
      id: user.id,
      role: 'guest',
      tableNumber: user.tableNumber,
      sessionId: user.sessionId,
    };
  }

  /**
   * Validate waiter credentials via access_users table.
   */
  private async validateWaiter(waiterId: string) {
    const accessUser = await this.prisma.accessUser.findUnique({
      where: { userId: waiterId },
      include: { waiter: true },
    });

    if (!accessUser || !accessUser.waiter) {
      throw new UnauthorizedException('Invalid waiter token');
    }

    return accessUser.waiter;
  }
}
