import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceAnalysisService } from './service-analysis.service';
import { ServiceAnalysisRequestDto } from '../dto/create-service-analysis.dto';

@Controller('service-analysis')
export class ServiceAnalysisController {
  constructor(private readonly serviceAnalysisService: ServiceAnalysisService) {}

  @Post()
  async createServiceAnalysis(@Body() data: ServiceAnalysisRequestDto) {
    return this.serviceAnalysisService.createServiceAnalysis(data);
  }

  @Get('session/:sessionId')
  @UseGuards(JwtAuthGuard)
  async getServiceAnalysisBySession(@Param('sessionId') sessionId: string) {
    return this.serviceAnalysisService.getServiceAnalysisBySession(sessionId);
  }

  @Get('waiter/:waiterId')
  @UseGuards(JwtAuthGuard)
  async getServiceAnalysisByWaiter(@Param('waiterId') waiterId: string) {
    return this.serviceAnalysisService.getServiceAnalysisByWaiter(waiterId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllServiceAnalysis() {
    return this.serviceAnalysisService.getAllServiceAnalysis();
  }
}
