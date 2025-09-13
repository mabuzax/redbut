import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { SessionCacheService } from '../common/session-cache.service';
import { BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';

/**
 * Authentication service for RedBut application
 * Handles anonymous user creation and JWT token generation
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly sessionCache: SessionCacheService,
  ) {}

  /**
   * Create or retrieve an anonymous user and generate a JWT token
   * @param tableNumber The table number where the user is seated
   * @returns User object and JWT token
   */
  async createAnonymousSession(tableNumber: number): Promise<{ user: User; token: string }> {
    this.logger.log(`Creating anonymous session for table ${tableNumber}`);
    
    // Generate a unique session ID for this visit
    const sessionId = this.generateSessionId();
    
    // Create or retrieve the anonymous user
    const user = await this.usersService.createAnonymousUser({
      tableNumber,
      sessionId,
    });

    // Generate JWT token
    const token = this.generateToken(user);

    return { user, token };
  }

  /**
   * Validate a user by their ID (used by JWT strategy)
   * Uses session cache to reduce database calls with 30-minute TTL
   * @param userId The user ID to validate
   * @returns User object if found, null otherwise
   */
  async validateUser(userId: string): Promise<User | null> {
    // Try cache first
    const cachedUser = await this.sessionCache.get(userId);
    if (cachedUser) {
      this.logger.debug(`Session cache hit for user ${userId}`);
      return cachedUser;
    }

    // Cache miss - fetch from database
    this.logger.debug(`Session cache miss for user ${userId}, fetching from database`);
    const user = await this.usersService.findById(userId);
    
    if (user) {
      // Cache the user for future requests
      await this.sessionCache.set(userId, user);
      this.logger.debug(`Cached user ${userId} for future requests`);
    }

    return user;
  }

  /**
   * Generate a JWT token for a user
   * @param user The user to generate a token for
   * @returns JWT token string
   */
  generateToken(user: User): string {
    const payload = {
      sub: user.id,
      tableNumber: user.tableNumber,
      sessionId: user.sessionId,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Verify a JWT token and return the payload
   * @param token JWT token to verify
   * @returns Decoded token payload or null if invalid
   */
  verifyToken(token: string): any {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate a unique session ID
   * @returns Unique session ID string
   */
  private generateSessionId(): string {
    // Generate a random string with timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomStr}`;
  }

  /**
   * Invalidate session cache for a user (called on table close)
   * @param userId User ID to remove from cache
   */
  async invalidateUserSession(userId: string): Promise<void> {
    // First, find any client associations with this user's session
    await this.cleanupClientSessionsByUserId(userId);
    
    // Then invalidate the user session
    await this.sessionCache.invalidate(userId);
    this.logger.log(`Invalidated session cache for user ${userId}`);
  }

  /**
   * Invalidate session cache by session ID (alternative method)
   * @param sessionId Session ID to remove from cache
   */
  async invalidateSessionById(sessionId: string): Promise<void> {
    await this.sessionCache.invalidateBySessionId(sessionId);
    this.logger.log(`Invalidated session cache for session ${sessionId}`);
  }

  /* ----------------------------------------------------------------------
   * Generic staff authentication (admin / waiter / manager) - OTP Based
   * -------------------------------------------------------------------- */

  /**
   * Generate and send OTP for waiter login (updated to use waiters table directly)
   * @param emailOrPhone   Email or phone number provided by the user
   * @param userType       The type of user ('waiter' | 'admin' | 'manager')
   * @returns Success message
   */
  async generateOTP(
    emailOrPhone: string,
    userType: 'waiter' | 'admin' | 'manager' = 'waiter',
  ): Promise<{ message: string; username: string }> {
    this.logger.log(`[Auth] Waiter OTP generation for ${userType}: ${emailOrPhone}`);

    // Find waiter by userType and email/phone directly in waiters table
    const waiter = await this.prisma.waiter.findFirst({
      where: {
        userType,
        OR: [
          { email: emailOrPhone },
          { phone: emailOrPhone },
        ],
      },
    });

    if (!waiter) {
      throw new UnauthorizedException('Waiter not found or invalid user type');
    }

    // Generate 6-digit OTP
    const otp = this.generateSixDigitOTP();
    
    // Store OTP in waiter record
    await this.prisma.waiter.update({
      where: { id: waiter.id },
      data: { code: otp },
    });

    // In a real application, you would send the OTP via SMS/Email
    // For demo purposes, we'll log it
    this.logger.log(`[Auth] Waiter OTP for ${emailOrPhone}: ${otp}`);
    
    // TODO: Implement actual SMS/Email sending here
    // await this.sendOTPViaSMS(waiter.phone, otp);
    // await this.sendOTPViaEmail(waiter.email, otp);

    return { 
      message: 'OTP sent successfully',
      username: waiter.email || waiter.phone || ''
    };
  }

  /**
   * Verify OTP and authenticate waiter (updated to use waiters table directly)
   * @param emailOrPhone   Email/phone of the waiter (used as username)
   * @param otp            6-digit OTP code
   * @param userType       The type of user ('waiter' | 'admin' | 'manager')
   * @returns The waiter record plus JWT token
   */
  async verifyOTPAndLogin(
    emailOrPhone: string,
    otp: string,
    userType: 'waiter' | 'admin' | 'manager' = 'waiter',
  ): Promise<{ waiter: any; token: string }> {
    this.logger.log(`[Auth] Waiter OTP verification for ${userType}: ${emailOrPhone}`);

    // Find waiter by email/phone and userType, include all necessary fields
    const waiter = await this.prisma.waiter.findFirst({
      where: {
        AND: [
          { userType },
          {
            OR: [
              { email: emailOrPhone },
              { phone: emailOrPhone },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        phone: true,
        userType: true,
        code: true,
        restaurantId: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!waiter) {
      throw new UnauthorizedException('Waiter not found');
    }

    if (!waiter.code || waiter.code !== otp) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    // Clear the OTP after successful verification
    await this.prisma.waiter.update({
      where: { id: waiter.id },
      data: { code: null },
    });

    // Generate JWT token with userType as role
    const token = this.jwtService.sign({
      sub: waiter.email || waiter.phone,
      role: waiter.userType,
      userId: waiter.id,
      userType: waiter.userType,
    });

    this.logger.log(`[Auth] Generated token for ${waiter.userType} waiter ${waiter.email || waiter.phone} with id ${waiter.id}`);

    return { waiter, token };
  }

  /**
   * Generate a 6-digit OTP code
   * @returns 6-digit OTP string
   */
  private generateSixDigitOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * DEPRECATED METHODS - Keeping for backward compatibility
   * These methods are replaced by OTP-based authentication
   */

  /**
   * @deprecated Use generateOTP and verifyOTPAndLogin instead
   */
  async staffLogin(
    username: string,
    password: string,
    userType: 'waiter' | 'admin' | 'manager' = 'waiter',
  ): Promise<{ waiter: any; token: string }> {
    throw new BadRequestException('Password authentication is deprecated. Use OTP authentication instead.');
  }

  /**
   * @deprecated Use generateOTP and verifyOTPAndLogin instead
   */
  async waiterLogin(username: string, password: string) {
    throw new BadRequestException('Password authentication is deprecated. Use OTP authentication instead.');
  }

  /**
   * @deprecated Password changes are no longer needed with OTP authentication
   */
  async changeWaiterPassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    throw new BadRequestException('Password changes are not supported with OTP authentication.');
  }

  /**
   * Validate a table session and optionally update user info
   * @param sessionId The session ID to validate
   * @param name Optional name/email/phone to update user record
   * @param clientId Optional client identifier to check for existing sessions
   * @returns Session validation result
   */
  async validateSession(sessionId: string, name?: string, clientId?: string) {
    this.logger.log(`[Auth] Validating session: ${sessionId}`);

    // If clientId is provided, check for existing active sessions
    if (clientId) {
      const existingSession = await this.checkExistingActiveSession(clientId, sessionId);
      if (existingSession) {
        throw new BadRequestException({
          message: 'If you need to change tables or sessions, please ask your waiter for assistance',
          existingSession: {
            sessionId: existingSession.sessionId,
            tableNumber: existingSession.tableNumber,
          }
        });
      }
    }

    // Find user by session ID
    const user = await this.prisma.user.findFirst({
      where: { sessionId },
    });

    if (!user) {
      throw new NotFoundException('Table session not found. Ask Waiter to assist you.');
    }

    // Get waiter information if waiterId exists (using any to work around TypeScript cache issue)
    let waiterInfo = null;
    const userWithWaiterId = user as any;
    if (userWithWaiterId.waiterId) {
      const waiter = await this.prisma.waiter.findUnique({
        where: { id: userWithWaiterId.waiterId },
        select: { id: true, name: true, surname: true },
      });
      if (waiter) {
        waiterInfo = {
          id: waiter.id,
          name: waiter.name,
          surname: waiter.surname,
        };
      }
    }

    // Update user name if provided
    if (name) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
      this.logger.log(`[Auth] Updated user name for session ${sessionId}: ${name}`);
    }

    // Generate JWT token for API access
    const token = this.generateToken(user);

    // Store client ID association if provided (for future session checks)
    if (clientId) {
      await this.associateClientWithSession(clientId, user.id, sessionId);
    }

    // Store session in localStorage (this will be handled on frontend)
    return {
      message: 'Session validated successfully',
      sessionId,
      tableNumber: user.tableNumber,
      userId: user.id,
      name: name || user.name,
      waiter: waiterInfo,
      token, // Add JWT token to response
    };
  }

  /**
   * Check if a client already has an active session
   * @param clientId Client identifier
   * @param currentSessionId Current session ID being validated
   * @returns Existing session if found, null otherwise
   */
  private async checkExistingActiveSession(clientId: string, currentSessionId: string) {
    try {
      // Check cache for active client sessions using cache manager directly
      const existingSessionKey = `client_session:${clientId}`;
      const existingSessionData = await this.sessionCache['cacheManager'].get(existingSessionKey);
      
      if (existingSessionData) {
        // Parse the session data
        const sessionInfo = typeof existingSessionData === 'string' 
          ? JSON.parse(existingSessionData) 
          : existingSessionData;
          
        // If it's the same session, allow it
        if (sessionInfo.sessionId === currentSessionId) {
          return null;
        }
        
        // Check if the existing session is still valid in the database
        const existingUser = await this.prisma.user.findFirst({
          where: { sessionId: sessionInfo.sessionId },
        });
        
        if (existingUser) {
          this.logger.log(`[Auth] Client ${clientId} already has active session: ${sessionInfo.sessionId}`);
          return {
            sessionId: sessionInfo.sessionId,
            tableNumber: existingUser.tableNumber,
            userId: existingUser.id,
          };
        } else {
          // Clean up stale session data
          await this.sessionCache['cacheManager'].del(existingSessionKey);
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error checking existing session for client ${clientId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Associate a client with a session for tracking
   * @param clientId Client identifier
   * @param userId User ID
   * @param sessionId Session ID
   */
  private async associateClientWithSession(clientId: string, userId: string, sessionId: string) {
    try {
      const sessionInfo = {
        userId,
        sessionId,
        timestamp: new Date().toISOString(),
      };
      
      // Store client session association with same TTL as user sessions
      const clientSessionKey = `client_session:${clientId}`;
      const ttlMs = 30 * 60 * 1000; // 30 minutes
      
      await this.sessionCache['cacheManager'].set(clientSessionKey, sessionInfo, ttlMs);
      this.logger.debug(`[Auth] Associated client ${clientId} with session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error associating client ${clientId} with session: ${error.message}`);
    }
  }

  /**
   * Clean up client session associations for a specific user
   * @param userId User ID whose client sessions should be cleaned up
   */
  private async cleanupClientSessionsByUserId(userId: string): Promise<void> {
    try {
      // Note: In a production environment, you might want to maintain a reverse index
      // or use Redis SCAN to find client sessions efficiently
      // For now, we'll log this operation and let TTL handle cleanup
      this.logger.debug(`[Auth] Scheduled cleanup of client sessions for user ${userId}`);
      
      // Since we can't efficiently iterate Redis keys with the current setup,
      // we'll rely on TTL expiration and validation checks during session access
    } catch (error) {
      this.logger.error(`Error cleaning up client sessions for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Generate OTP for tenant authentication
   */
  async generateTenantOTP(emailOrPhone: string): Promise<{ message: string; email: string }> {
    this.logger.log(`[Auth] Tenant OTP generation for: ${emailOrPhone}`);

    // Find tenant by email or phone
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        AND: [
          { status: 'Active' },
          {
            OR: [
              { email: emailOrPhone },
              { phone: emailOrPhone },
            ],
          },
        ],
      },
    });

    if (!tenant) {
      throw new UnauthorizedException('Tenant not found or inactive');
    }

    // Generate 6-digit OTP
    const otp = this.generateSixDigitOTP();
    
    // Store OTP in tenant record
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { code: otp },
    });

    this.logger.log(`[Auth] Tenant OTP for ${emailOrPhone}: ${otp}`);

    return {
      message: 'OTP sent successfully',
      email: tenant.email || emailOrPhone,
    };
  }

  /**
   * Verify OTP and login tenant
   */
  async verifyTenantOTPAndLogin(
    emailOrPhone: string,
    otp: string,
  ): Promise<{ tenant: any; token: string }> {
    this.logger.log(`[Auth] Tenant OTP verification for: ${emailOrPhone}`);

    // Find tenant with matching OTP
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        AND: [
          { status: 'Active' },
          { code: otp },
          {
            OR: [
              { email: emailOrPhone },
              { phone: emailOrPhone },
            ],
          },
        ],
      },
      include: {
        restaurants: true,
      },
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid OTP or tenant not found');
    }

    // Clear the OTP after successful verification
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { code: null },
    });

    // Generate JWT token for tenant
    const payload = {
      sub: tenant.id,
      type: 'tenant',
      tenantId: tenant.id, // Add tenantId for data isolation
      email: tenant.email,
      name: tenant.name,
    };

    const token = this.jwtService.sign(payload);

    this.logger.log(`[Auth] Tenant login successful: ${tenant.email}`);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        restaurants: tenant.restaurants,
      },
      token,
    };
  }

  /**
   * Refresh JWT token to extend expiry by another hour
   * Used for sliding session functionality
   */
  async refreshToken(currentToken: string): Promise<{ token: string; tenant: any } | null> {
    try {
      // Verify and decode the current token
      const decoded = this.jwtService.verify(currentToken);
      
      if (decoded.type === 'tenant') {
        // Get fresh tenant data
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: decoded.sub },
          include: {
            restaurants: true,
          },
        });

        if (!tenant) {
          throw new UnauthorizedException('Tenant not found');
        }

        // Generate new token with fresh expiry
        const payload = {
          sub: tenant.id,
          type: 'tenant',
          tenantId: tenant.id,
          email: tenant.email,
          name: tenant.name,
        };

        const newToken = this.jwtService.sign(payload);

        this.logger.log(`[Auth] Token refreshed for tenant: ${tenant.email}`);

        return {
          tenant: {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            restaurants: tenant.restaurants,
          },
          token: newToken,
        };
      }

      // For other token types, implement as needed
      return null;
    } catch (error) {
      this.logger.error(`[Auth] Token refresh failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token for refresh');
    }
  }
}
