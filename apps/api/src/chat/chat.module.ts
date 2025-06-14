import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { PrismaService } from '../common/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RequestsModule } from '../requests/requests.module';
import { UsersModule } from '../users/users.module';

/**
 * Chat module for real-time AI chat functionality
 * Integrates WebSocket communication with OpenAI
 */
@Module({
  imports: [
    // Import AuthModule for JWT authentication
    AuthModule,
    // Import RequestsModule for creating waiter requests
    RequestsModule,
    // Import UsersModule for user data access
    UsersModule,
  ],
  providers: [
    ChatService,
    ChatGateway,
    WsJwtGuard,
    PrismaService,
  ],
  exports: [
    ChatService,
  ],
})
export class ChatModule {}
