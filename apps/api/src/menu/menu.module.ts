import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [MenuController],
})
export class MenuModule {}
