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
import * as crypto from 'crypto';

@WebSocketGateway({
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

  afterInit() {
    this.logger.log('Chat WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`Client connecting: ${client.id} (Handshake: ${JSON.stringify(client.handshake)})`);
     
      this.logger.debug(`Client handshake auth: ${JSON.stringify(client.handshake.auth)}`);
      const token = this.extractTokenFromHandshake(client);
      if (!token) {
        this.disconnect(client, 'Unauthorized: No token provided');
        return;
      }

      const payload = this.jwtService.verify(token);
      if (!payload || !payload.sub) {
        this.disconnect(client, 'Unauthorized: Invalid token');
        return;
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        this.disconnect(client, 'Unauthorized: User not found');
        return;
      }

      client.data.user = {
        id: user.id,
        tableNumber: user.tableNumber,
        sessionId: user.sessionId,
      };

      this.logger.log(`Client connected: ${client.id} (User: ${user.id}, Table: ${user.tableNumber}, Session: ${user.sessionId})`);

      client.emit('assistant-message', {
        content: 'Hi there, I am your waiter assistant AI agent. How can I assist you?',
        timestamp: new Date().toISOString(),
      });

     
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      this.disconnect(client, 'Error during connection setup');
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.id || 'Unknown';
    this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('client-message')
  async handleMessage(client: Socket, payload: { content: string }) {
    try {
      if (!payload || !payload.content || typeof payload.content !== 'string') {
        throw new WsException('Invalid message format');
      }

      const { content } = payload;
      const { id: userId, tableNumber, sessionId } = client.data.user;
      const threadId = crypto.randomUUID();

      this.logger.debug(`Message for thread ${threadId} from user ${userId} (table: ${tableNumber}, session: ${sessionId}): ${content}`);

      const aiResponse = await this.chatService.processMessage(
        userId,
        tableNumber,
        sessionId,
        content,
        threadId,
      );

      client.emit('assistant-message', {
        content: aiResponse,
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

  private extractTokenFromHandshake(client: Socket): string | null {
    const auth = client.handshake.auth;
    if (auth && auth.token) {
      return auth.token;
    }

    const headers = client.handshake.headers;
    if (headers.authorization) {
      const [type, token] = headers.authorization.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    const query = client.handshake.query;
    if (query && query.token && typeof query.token === 'string') {
      return query.token;
    }

    return null;
  }

  private disconnect(client: Socket, reason: string) {
    client.emit('error', { message: reason });
    client.disconnect(true);
    this.logger.warn(`Client disconnected: ${reason}`);
  }
}
