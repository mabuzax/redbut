import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

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
   * @param userId The user ID to validate
   * @returns User object if found, null otherwise
   */
  async validateUser(userId: string): Promise<User | null> {
    return this.usersService.findById(userId);
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

  /* ----------------------------------------------------------------------
   * Waiter authentication (dashboard login)
   * -------------------------------------------------------------------- */

  /**
   * Simple helper returning TRUE if the supplied password is the default
   * first-time password that forces a change on initial login.
   */
  verifyDefaultPassword(password: string): boolean {
    return password === '__new__pass';
  }

  /* ----------------------------------------------------------------------
   * Generic staff authentication (admin / waiter / manager)
   * -------------------------------------------------------------------- */

  /**
   * Authenticate a **staff** user (waiter / admin / manager) using the
   * credentials stored in the `access_users` table.
   *
   * @param username   Email / username provided by the user.
   * @param password   Plain-text password entered.
   * @param userType   The type of user we expect (`'waiter'` | `'admin'` | `'manager'`).
   *                   Defaults to `'waiter'` for backward-compatibility.
   *
   * @returns The related waiter record (or admin waiter-record placeholder)
   *          **plus** a freshly-issued JWT token whose `role` claim === `userType`.
   *
   * @throws  UnauthorizedException if the credentials are invalid.
   */
  async staffLogin(
    username: string,
    password: string,
    userType: 'waiter' | 'admin' | 'manager' = 'waiter',
  ): Promise<{ waiter: any; token: string }> {
    this.logger.log(`[Auth] ${userType} login attempt for ${username}`);

    // Search by username AND userType to ensure proper account separation
    const accessUser = await this.prisma.accessUser.findFirst({
      where: {
        username,
        userType,
      },
      include: { waiter: true },
    });

    if (!accessUser) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (accessUser.password !== password) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // Sign JWT with correct role
    const token = this.jwtService.sign({
      sub: accessUser.userId,
      role: userType,
    });

    return { waiter: accessUser.waiter, token };
  }

  /**
   * DEPRECATED – kept for backward-compatibility with existing waiter
   * controllers. Internally forwards to `staffLogin` with `userType="waiter"`.
   */
  async waiterLogin(username: string, password: string) {
    return this.staffLogin(username, password, 'waiter');
  }

  /**
   * Change a waiter's password.  The old password must match the current one
   * (or be the default `__new__pass`).  After success the new password is
   * persisted in `access_users`.
   */
  async changeWaiterPassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const account = await this.prisma.accessUser.findUnique({ where: { userId } });
    if (!account) {
      throw new BadRequestException('Waiter account not found');
    }

    const oldOk =
      account.password === oldPassword ||
      (this.verifyDefaultPassword(account.password) && this.verifyDefaultPassword(oldPassword));

    if (!oldOk) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    await this.prisma.accessUser.update({
      where: { userId },
      data: { password: newPassword },
    });
  }
}
