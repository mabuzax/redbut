import { Module } from '@nestjs/common';
import { ServiceAnalysisController } from './service-analysis.controller';
import { ServiceAnalysisService } from './service-analysis.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [ServiceAnalysisController],
  providers: [ServiceAnalysisService, PrismaService],
  exports: [ServiceAnalysisService],
})
export class ServiceAnalysisModule {}
