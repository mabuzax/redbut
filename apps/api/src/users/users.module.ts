import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../common/prisma.service';

/**
 * Users module for managing user data
 * Handles creating and retrieving user information
 * Used primarily for anonymous user sessions in the restaurant
 */
@Module({
  providers: [
    UsersService,
    PrismaService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
