import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

// Key for storing roles metadata
export const ROLES_KEY = 'roles';

/**
 * Custom decorator to assign roles to a route handler.
 * Usage: @Roles('admin', 'waiter')
 * @param roles The roles required to access the route.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Guard that checks if the authenticated user has the required roles to access a route.
 * Works in conjunction with JwtAuthGuard, which populates `req.user`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Determines if the current request is allowed to proceed based on user roles.
   * @param context The execution context (route handler, class).
   * @returns True if the user has the required role, false otherwise.
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Get the required roles from the @Roles() decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified, the route is public (no role required)
    if (!requiredRoles) {
      return true;
    }

    // Get the user from the request (populated by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // If no user or user has no role, deny access
    if (!user || !user.role) {
      return false;
    }

    // Check if the user's role is included in the required roles
    return requiredRoles.some((role) => user.role === role);
  }
}
