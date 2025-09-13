import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract tenantId from the authenticated user
 * Usage: @TenantId() tenantId: string
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // For tenant type users, use their tenantId
    if (user?.type === 'tenant' && user?.tenantId) {
      return user.tenantId;
    }
    
    // For other user types, they might have a tenantId field or derive it from context
    if (user?.tenantId) {
      return user.tenantId;
    }
    
    // Fallback: if user is a tenant themselves, use their ID
    if (user?.type === 'tenant') {
      return user.id;
    }
    
    throw new Error('TenantId not found in user context. Ensure user is authenticated and belongs to a tenant.');
  },
);