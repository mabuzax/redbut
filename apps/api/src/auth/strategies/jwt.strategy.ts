import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../common/prisma.service';

console.log('JWT STRATEGY FILE LOADED - THIS SHOULD APPEAR IN LOGS');

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
    const jwtSecret = configService.get('JWT_SECRET', 'super-secret-for-redbut-dev');
    console.log('[JWT Strategy] Constructor - Using JWT secret:', jwtSecret.substring(0, 10) + '...');
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * Validate the JWT payload and return the user
   * @param payload JWT payload with user information
   * @returns User object to attach to the request
   */
  async validate(payload: any) {
    console.log('[JWT Strategy] VALIDATE METHOD CALLED');
    console.log('[JWT Strategy] Validating token payload:', JSON.stringify(payload, null, 2));
    const { sub: username, role, userId } = payload;

    if (role === 'waiter') {
      const waiter = await this.validateWaiter(userId || username);
      return {
        id: waiter.id,
        role: 'waiter',
        name: `${waiter.name} ${waiter.surname}`,
      };
    }

    if (role === 'admin') {
      const admin = await this.validateAdmin(userId || username);
      return {
        id: admin.id,
        role: 'admin',
        name: `${admin.name} ${admin.surname}`,
      };
    }

    // Default flow for web users - use session cache
    console.log('[JWT Strategy] Using session cache for web user validation');
    const user = await this.authService.validateUser(userId || username);
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
  private async validateWaiter(userIdOrUsername: string) {
    console.log('[JWT Strategy] Validating waiter with identifier:', userIdOrUsername);
    
    // Try to find by userId first, then by username
    console.log('[JWT Strategy] Searching by userId...');
    let accessUser = await this.prisma.accessUser.findUnique({
      where: { userId: userIdOrUsername },
      include: { waiter: true },
    });

    if (!accessUser) {
      console.log('[JWT Strategy] User not found by userId, trying username...');
      // Try to find by username
      accessUser = await this.prisma.accessUser.findFirst({
        where: { username: userIdOrUsername },
        include: { waiter: true },
      });
    }

    console.log('[JWT Strategy] Found access user:', accessUser ? 'YES' : 'NO');
    if (accessUser) {
      console.log('[JWT Strategy] Access user details - userId:', accessUser.userId, 'username:', accessUser.username);
      console.log('[JWT Strategy] Waiter relation exists:', !!accessUser.waiter);
    }
    
    if (!accessUser || !accessUser.waiter) {
      console.log('[JWT Strategy] Throwing error - accessUser exists:', !!accessUser, 'waiter exists:', !!(accessUser?.waiter));
      throw new UnauthorizedException('Invalid waiter token');
    }

    console.log('[JWT Strategy] Validation successful, returning waiter:', accessUser.waiter.id);
    return accessUser.waiter;
  }

  /**
   * Validate admin credentials via access_users table.
   */
  private async validateAdmin(userIdOrUsername: string) {
    // Try to find by userId first, then by username
    let accessUser = await this.prisma.accessUser.findUnique({
      where: { userId: userIdOrUsername },
      include: { waiter: true },
    });

    if (!accessUser) {
      // Try to find by username
      accessUser = await this.prisma.accessUser.findFirst({
        where: { username: userIdOrUsername },
        include: { waiter: true },
      });
    }

    if (!accessUser || accessUser.userType !== 'admin') {
      throw new UnauthorizedException('Invalid admin token');
    }

    // Re-use waiter table to store personal details for now
    const adminProfile = accessUser.waiter;
    if (!adminProfile) {
      throw new UnauthorizedException('Admin profile not found');
    }

    return adminProfile;
  }
}
