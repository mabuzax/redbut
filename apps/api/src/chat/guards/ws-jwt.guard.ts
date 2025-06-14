import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UsersService } from '../../users/users.service';

/**
 * JWT Guard for WebSocket connections
 * Validates JWT tokens for socket connections
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Determine if the current socket connection is authorized
   * @param context WebSocket execution context
   * @returns Boolean indicating if the connection is authorized
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Get socket client from context
      const client: Socket = context.switchToWs().getClient();
      
      // Check if user data is already attached to socket
      if (client.data.user) {
        return true;
      }

      // Extract token from socket handshake
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        throw new WsException('Unauthorized: No token provided');
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      if (!payload || !payload.sub) {
        throw new WsException('Unauthorized: Invalid token');
      }

      // Get user from database
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new WsException('Unauthorized: User not found');
      }

      // Attach user data to socket for future use
      client.data.user = {
        id: user.id,
        tableNumber: user.tableNumber,
        sessionId: user.sessionId,
      };

      return true;
    } catch (error) {
      this.logger.error(`WebSocket authentication failed: ${error.message}`);
      throw new WsException('Unauthorized: Authentication failed');
    }
  }

  /**
   * Extract JWT token from socket connection
   * @param client Socket client
   * @returns JWT token or null
   */
  private extractTokenFromSocket(client: Socket): string | null {
    // Try to get from auth object
    const auth = client.handshake.auth;
    if (auth && auth.token) {
      return auth.token;
    }

    // Try to get from headers
    const headers = client.handshake.headers;
    if (headers.authorization) {
      const [type, token] = headers.authorization.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    // Try to get from query params
    const query = client.handshake.query;
    if (query && query.token && typeof query.token === 'string') {
      return query.token;
    }

    return null;
  }
}
