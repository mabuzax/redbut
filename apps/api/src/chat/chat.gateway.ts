import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UnauthorizedException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { UsersService } from '../users/users.service';

@WebSocketGateway({
  // Socket.IO namespace – keep leading slash for clarity
  namespace: '/chat',
   cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Initialize the gateway
   */
  afterInit() {
    this.logger.log('Chat WebSocket Gateway initialized');
  }

  /**
   * Handle new client connections
   * @param client Socket client
   */
  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or query

      this.logger.log(`Client connecting: ${client.id} (Handshake: ${JSON.stringify(client.handshake)})`);
     
      this.logger.debug(`Client handshake auth: ${JSON.stringify(client.handshake.auth)}`);
      const token = this.extractTokenFromHandshake(client);
      if (!token) {
        this.disconnect(client, 'Unauthorized: No token provided');
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      if (!payload || !payload.sub) {
        this.disconnect(client, 'Unauthorized: Invalid token');
        return;
      }

      // Get user from database
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        this.disconnect(client, 'Unauthorized: User not found');
        return;
      }

      // Store user data in socket
      client.data.user = {
        id: user.id,
        tableNumber: user.tableNumber,
        sessionId: user.sessionId,
      };

      this.logger.log(`Client connected: ${client.id} (User: ${user.id}, Table: ${user.tableNumber})`);

      // Send welcome message
      client.emit('assistant-message', {
        content: 'Hi there, I am your waiter assistant AI agent. How can I assist you?',
        timestamp: new Date().toISOString(),
      });

     
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      this.disconnect(client, 'Error during connection setup');
    }
  }

  /**
   * Handle client disconnections
   * @param client Socket client
   */
  handleDisconnect(client: Socket) {
    const userId = client.data.user?.id || 'Unknown';
    this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
  }

  /**
   * Handle client messages
   * @param client Socket client
   * @param payload Message payload
   * @returns Processed message
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('client-message')
  async handleMessage(client: Socket, payload: { content: string }) {
    try {
      // Validate payload
      if (!payload || !payload.content || typeof payload.content !== 'string') {
        throw new WsException('Invalid message format');
      }

      const { content } = payload;
      const { id: userId, tableNumber } = client.data.user;

      this.logger.debug(`Message from user ${userId}: ${content}`);

      // Process message with AI
      const { response } = await this.chatService.processMessage(
        userId,
        tableNumber,
        content,
      );

      // Emit response to client
      client.emit('assistant-message', {
        content: response,
        timestamp: new Date().toISOString(),
      });


      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`);
      client.emit('error', {
        message: 'Failed to process your message. Please try again.',
      });
      return { success: false, error: 'Message processing failed' };
    }
  }

  /**
   * Clear chat history for a user
   * @param client Socket client
   * @returns Result of clearing history
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('clear-history')
  async handleClearHistory(client: Socket) {
    try {
      const { id: userId } = client.data.user;
      const result = await this.chatService.clearChatHistory(userId);
      
      client.emit('history-cleared', {
        count: result.count,
        timestamp: new Date().toISOString(),
      });
      
      return { success: true, count: result.count };
    } catch (error) {
      this.logger.error(`Error clearing history: ${error.message}`);
      client.emit('error', {
        message: 'Failed to clear chat history. Please try again.',
      });
      return { success: false, error: 'History clearing failed' };
    }
  }

  /**
   * Extract JWT token from handshake
   * @param client Socket client
   * @returns JWT token or null
   */
  private extractTokenFromHandshake(client: Socket): string | null {
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

  /**
   * Disconnect a client with error message
   * @param client Socket client
   * @param reason Reason for disconnection
   */
  private disconnect(client: Socket, reason: string) {
    client.emit('error', { message: reason });
    client.disconnect(true);
    this.logger.warn(`Client disconnected: ${reason}`);
  }
}
