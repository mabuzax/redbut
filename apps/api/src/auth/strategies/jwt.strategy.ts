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
    const { sub: username, role, userId, type, email, name, tenantId } = payload;

    // Handle tenant authentication (admin users) - no database lookup needed
    if (type === 'tenant') {
      console.log('[JWT Strategy] Validating tenant token - no database lookup required');
      return {
        id: username, // Use the tenant ID from the token
        role: 'admin',
        name: name || 'Tenant Admin',
        email: email,
        userType: 'admin',
        type: 'tenant',
        tenantId: tenantId || username // Include tenantId for data filtering
      };
    }

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
   * Validate waiter credentials via waiters table directly.
   */
  private async validateWaiter(userIdOrEmailOrPhone: string) {
    console.log('[JWT Strategy] Validating waiter with identifier:', userIdOrEmailOrPhone);
    
    // Try to find by userId first, then by email/phone
    console.log('[JWT Strategy] Searching by userId...');
    let waiter = await this.prisma.waiter.findUnique({
      where: { id: userIdOrEmailOrPhone },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        phone: true,
        userType: true,
        restaurantId: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!waiter) {
      console.log('[JWT Strategy] User not found by userId, trying email/phone...');
      // Try to find by email or phone
      waiter = await this.prisma.waiter.findFirst({
        where: {
          OR: [
            { email: userIdOrEmailOrPhone },
            { phone: userIdOrEmailOrPhone },
          ],
        },
        select: {
          id: true,
          name: true,
          surname: true,
          email: true,
          phone: true,
          userType: true,
          restaurantId: true,
          createdAt: true,
          updatedAt: true,
        }
      });
    }

    console.log('[JWT Strategy] Found waiter:', waiter ? 'YES' : 'NO');
    if (waiter) {
      console.log('[JWT Strategy] Waiter details - id:', waiter.id, 'email:', waiter.email, 'userType:', waiter.userType);
    }
    
    if (!waiter) {
      console.log('[JWT Strategy] Throwing error - waiter not found');
      throw new UnauthorizedException('Invalid waiter token');
    }

    console.log('[JWT Strategy] Validation successful, returning waiter:', waiter.id);
    return waiter;
  }

  /**
   * Validate admin credentials via waiters table directly.
   */
  private async validateAdmin(userIdOrEmailOrPhone: string) {
    // Try to find by userId first, then by email/phone
    let waiter = await this.prisma.waiter.findUnique({
      where: { id: userIdOrEmailOrPhone },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        phone: true,
        userType: true,
        restaurantId: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!waiter) {
      // Try to find by email or phone
      waiter = await this.prisma.waiter.findFirst({
        where: {
          OR: [
            { email: userIdOrEmailOrPhone },
            { phone: userIdOrEmailOrPhone },
          ],
        },
        select: {
          id: true,
          name: true,
          surname: true,
          email: true,
          phone: true,
          userType: true,
          restaurantId: true,
          createdAt: true,
          updatedAt: true,
        }
      });
    }

    if (!waiter || waiter.userType !== 'admin') {
      throw new UnauthorizedException('Invalid admin token');
    }

    return waiter;
  }
}
