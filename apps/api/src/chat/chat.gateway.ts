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
import { ChatRole } from '@prisma/client';
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
  private welcomedSessions = new Set<string>(); // Track sessions that have received welcome messages

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

      // Only send welcome messages if this session hasn't been welcomed before
      const sessionKey = `${user.id}_${user.sessionId}`;
      if (!this.welcomedSessions.has(sessionKey)) {
        // Store welcome messages in database as chat history
        await this.chatService.storeMessage(
          user.id,
          'assistant',
          'Hi!, I am your Waiter Assistant AI. Ask me about the menu, your order status, ingredients, specials, or recommendations!'
        );
        
        await this.chatService.storeMessage(
          user.id,
          'assistant',
          'I can also call the WAITER to the table for you.  Simply say so.'
        );
        
        // Mark this session as welcomed
        this.welcomedSessions.add(sessionKey);
        
        // Send chat history (which now includes the welcome messages)
        const recentMessages = await this.chatService.getRecentMessages(user.id, 100);
        client.emit('chat-history', recentMessages);
      } else {
        // For existing sessions, just send the chat history
        const recentMessages = await this.chatService.getRecentMessages(user.id, 100);
        client.emit('chat-history', recentMessages);
      }

     
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
      // Use a consistent thread ID for the conversation - based on user + session
      const threadId = `${userId}_${sessionId}`;

      this.logger.debug(`Message for thread ${threadId} from user ${userId} (table: ${tableNumber}, session: ${sessionId}): ${content}`);

      const aiResponse = await this.chatService.processMessage(
        userId,
        tableNumber,
        sessionId,
        content,
        threadId,
      );

      // Check if the response is the special menu opening action
      let parsedResponse = null;
      if (typeof aiResponse === 'string') {
        console.log('Parsing AI response string as JSON if possible');
        try {
          parsedResponse = JSON.parse(aiResponse);
        } catch {
          // Not JSON, continue with regular string response
          console.log('AI response is not JSON, treating as regular message', aiResponse);
        }
      } else if (typeof aiResponse === 'object') {
        console.log('AI response is already an object');
        parsedResponse = aiResponse;
      }

      console.log('AI Response:', aiResponse);
      console.log('Parsed Response:', parsedResponse);
      if (parsedResponse && parsedResponse.action === 'open_menu_search') {
        console.log('🔔 Detected open_menu_search action from AI response:', parsedResponse);
        
        // Send the assistant message first to ensure it's received
        client.emit('assistant-message', {
          content: parsedResponse.message,
          timestamp: new Date().toISOString(),
        });
        
        // Then emit the menu opening event after a small delay
        setTimeout(() => {
          client.emit('open-menu-search', {
            searchTerm: parsedResponse.searchTerm,
            itemName: parsedResponse.itemName,
            timestamp: new Date().toISOString(),
          });
        }, 50);
      } else if (parsedResponse && parsedResponse.action === 'open_requests_view') {
        console.log('🔔 Detected open_requests_view action from AI response:', parsedResponse);
        
        // Send the assistant message first to ensure it's received
        client.emit('assistant-message', {
          content: parsedResponse.message,
          timestamp: new Date().toISOString(),
        });
        
        // Then emit the requests view opening event after a small delay
        setTimeout(() => {
          client.emit('open-requests-view', {
            timestamp: new Date().toISOString(),
          });
        }, 50);
      } else if (parsedResponse && parsedResponse.action === 'open_orders_view') {
        console.log('🔔 Detected open_orders_view action from AI response:', parsedResponse);
        
        // Send the assistant message first to ensure it's received
        client.emit('assistant-message', {
          content: parsedResponse.message,
          timestamp: new Date().toISOString(),
        });
        
        // Then emit the orders view opening event after a small delay
        setTimeout(() => {
          client.emit('open-orders-view', {
            timestamp: new Date().toISOString(),
          });
        }, 50);
      } else if (parsedResponse && parsedResponse.action === 'open_menu_view') {
        console.log('🔔 Detected open_menu_view action from AI response:', parsedResponse);
        
        // Send the assistant message first to ensure it's received
        client.emit('assistant-message', {
          content: parsedResponse.message,
          timestamp: new Date().toISOString(),
        });
        
        // Then emit the menu view opening event after a small delay
        setTimeout(() => {
          client.emit('open-menu-view', {
            timestamp: new Date().toISOString(),
          });
        }, 50);
      } else {
        // Regular chat response
        console.log('💬 Sending regular AI response to client:', aiResponse);
        client.emit('assistant-message', {
          content: aiResponse,
          timestamp: new Date().toISOString(),
        });
      }


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
