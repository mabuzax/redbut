import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

/**
 * JWT Authentication Guard
 * Protects routes that require authentication
 * Uses the JWT strategy defined in JwtStrategy
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determines if the current request is allowed to proceed
   * @param context Execution context
   * @returns Boolean indicating if the request can proceed
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    console.log('[JWT Auth Guard] canActivate called');
    
    // Check for public route metadata
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    // If route is marked as public, allow access
    if (isPublic) {
      console.log('[JWT Auth Guard] Route is public, allowing access');
      return true;
    }

    console.log('[JWT Auth Guard] Route requires authentication, calling super.canActivate');
    // Otherwise, use the JWT authentication strategy
    return super.canActivate(context);
  }

  /**
   * Handle unauthorized access
   * @param err Error object
   * @param _info Additional info
   * @returns Never - throws UnauthorizedException
   */
  handleRequest(err: any, user: any, _info: any): any {
    console.log('[JWT Auth Guard] handleRequest called with err:', err, 'user:', user, 'info:', _info);
    
    // If there's an error or no user, throw an unauthorized exception
    if (err || !user) {
      console.log('[JWT Auth Guard] Throwing UnauthorizedException - err exists:', !!err, 'user exists:', !!user);
      throw err || new UnauthorizedException('Authentication required');
    }
    
    // Otherwise return the authenticated user
    return user;
  }
}
