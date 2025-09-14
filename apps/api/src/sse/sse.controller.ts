import { 
  Controller, 
  Sse, 
  Param, 
  Headers, 
  Logger, 
  UnauthorizedException,
  Req,
  ForbiddenException,
  Query 
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { SSEService, MessageEvent } from './sse.service';
import { Request } from 'express';

@Controller('sse')
export class SSEController {
  private readonly logger = new Logger(SSEController.name);

  constructor(
    private readonly sseService: SSEService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * SSE endpoint for customer session notifications
   * URL: /sse/session/:sessionId
   * Supports token via Authorization header or query parameter
   */
  @Sse('session/:sessionId')
  async sessionNotifications(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authHeader: string,
    @Query('token') tokenQuery: string,
    @Req() request: Request,
  ): Promise<Observable<MessageEvent>> {
    try {
      // Validate JWT token (try header first, then query parameter)
      const token = this.extractToken(authHeader, tokenQuery);
      const payload = this.jwtService.verify(token);
      
      this.logger.log(`SSE session connection: URL sessionId=${sessionId}, JWT sub=${payload.sub}, JWT sessionId=${payload.sessionId}`);
      
      // Security: Ensure user has access to this session  
      // The sessionId in the URL is actually the userId, and JWT sub should match
      if (payload.sub !== sessionId) {
        this.logger.warn(`Access denied: User ${payload.sub} tried to access session ${sessionId}`);
        throw new ForbiddenException('Access denied to this session');
      }

      // Generate unique connection ID
      const connectionId = `session-${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      this.logger.log(`SSE connection established for session: ${sessionId} (${connectionId})`);
      this.logger.debug(`Session user info:`, { 
        userId: payload.userId,
        userType: payload.userType,
        tableNumber: payload.tableNumber,
        ip: request.ip 
      });

      return this.sseService.createSessionEventStream(sessionId, connectionId);

    } catch (error) {
      this.logger.error(`SSE connection failed for session ${sessionId}: ${error.message}`);
      
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  /**
   * SSE endpoint for waiter notifications
   * URL: /sse/waiter/:waiterId
   * Supports token via Authorization header or query parameter
   */
  @Sse('waiter/:waiterId')
  async waiterNotifications(
    @Param('waiterId') waiterId: string,
    @Headers('authorization') authHeader: string,
    @Query('token') tokenQuery: string,
    @Req() request: Request,
  ): Promise<Observable<MessageEvent>> {
    try {
      // Validate JWT token (try header first, then query parameter)
      const token = this.extractToken(authHeader, tokenQuery);
      const payload = this.jwtService.verify(token);
      
      // Security: Ensure user is the correct waiter
      if (payload.userId !== waiterId || payload.userType !== 'waiter') {
        this.logger.warn(`Access denied: User ${payload.userId} (type: ${payload.userType}) tried to access waiter ${waiterId} notifications`);
        throw new ForbiddenException('Access denied to waiter notifications');
      }

      // Generate unique connection ID
      const connectionId = `waiter-${waiterId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      this.logger.log(`SSE connection established for waiter: ${waiterId} (${connectionId})`);
      this.logger.debug(`Waiter user info:`, { 
        userId: payload.userId,
        userType: payload.userType,
        waiterName: payload.name,
        ip: request.ip 
      });

      return this.sseService.createWaiterEventStream(waiterId, connectionId);

    } catch (error) {
      this.logger.error(`SSE connection failed for waiter ${waiterId}: ${error.message}`);
      
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  /**
   * Health check endpoint for SSE service
   * URL: /sse/health
   */
  @Sse('health')
  healthCheck(): Observable<MessageEvent> {
    this.logger.log('SSE health check requested');
    
    return new Observable(observer => {
      const stats = this.sseService.getActiveConnectionsCount();
      
      observer.next({
        type: 'health',
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          activeConnections: stats,
          message: 'SSE service is operational',
        },
        id: `health-${Date.now()}`,
      });

      // Send periodic health updates
      const interval = setInterval(() => {
        const currentStats = this.sseService.getActiveConnectionsCount();
        observer.next({
          type: 'health',
          data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            activeConnections: currentStats,
            message: 'SSE service is operational',
          },
          id: `health-${Date.now()}`,
        });
      }, 30000); // Every 30 seconds

      return () => {
        clearInterval(interval);
        this.logger.log('SSE health check stream closed');
      };
    });
  }

  /**
   * Extract and validate JWT token from Authorization header or query parameter
   */
  private extractToken(authHeader?: string, tokenQuery?: string): string {
    // Try Authorization header first
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '').trim();
      if (token) {
        return token;
      }
    }

    // Fallback to query parameter (for EventSource compatibility)
    if (tokenQuery) {
      return tokenQuery.trim();
    }

    throw new UnauthorizedException('Authorization token required (header or query parameter)');
  }
}