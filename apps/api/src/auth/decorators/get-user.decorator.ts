import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract the authenticated user from the request
 * 
 * Usage:
 * - @GetUser() user: any - Gets the entire user object
 * - @GetUser('id') userId: string - Gets a specific property from the user object
 * 
 * @param property Optional property to extract from the user object
 * @returns The user object or the specified property
 */
export const GetUser = createParamDecorator(
  (property: string | undefined, ctx: ExecutionContext) => {
    // Extract the request from the execution context
    const request = ctx.switchToHttp().getRequest();
    
    // Get the user object that was added by the JwtAuthGuard/JwtStrategy
    const user = request.user;
    
    // If no property is specified, return the entire user object
    if (!property) {
      return user;
    }
    
    // Otherwise, return the specified property
    return user?.[property];
  },
);
