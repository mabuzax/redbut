import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';

/**
 * Interceptor that automatically refreshes JWT tokens when they are close to expiry
 * Implements sliding session functionality
 */
@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
  private readonly REFRESH_THRESHOLD = 15 * 60; // Refresh if less than 15 minutes remaining

  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(async () => {
        try {
          const authHeader = request.headers.authorization;
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return;
          }

          const token = authHeader.replace('Bearer ', '');
          const decoded = this.jwtService.decode(token) as any;

          if (!decoded || !decoded.exp) {
            return;
          }

          const currentTime = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = decoded.exp - currentTime;

          // If token expires within the threshold, refresh it
          if (timeUntilExpiry <= this.REFRESH_THRESHOLD && timeUntilExpiry > 0) {
            console.log(`🔄 Token expires in ${timeUntilExpiry} seconds, refreshing...`);
            
            const refreshResult = await this.authService.refreshToken(token);
            if (refreshResult) {
              // Add the new token to the response headers
              response.setHeader('X-New-Token', refreshResult.token);
              console.log('✅ Token refreshed and sent in X-New-Token header');
            }
          }
        } catch (error) {
          // Don't break the request if token refresh fails
          console.error('❌ Error in token refresh interceptor:', error.message);
        }
      }),
    );
  }
}