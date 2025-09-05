import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ServiceAnalysisRequestDto, happinessToRating } from '../dto/create-service-analysis.dto';

@Injectable()
export class ServiceAnalysisService {
  constructor(private prisma: PrismaService) {}

  async createServiceAnalysis(data: ServiceAnalysisRequestDto) {
    // Validate that waiterId is provided
    if (!data.waiterId) {
      throw new Error('waiterId is required for service analysis');
    }

    // Calculate rating from happiness level in the analysis
    const analysis = data.analysis as any;
    const rating = analysis.happiness ? happinessToRating(analysis.happiness) : 3;

    return this.prisma.serviceAnalysis.create({
      data: {
        sessionId: data.sessionId,
        userId: data.userId,
        waiterId: data.waiterId,
        rating: rating,
        analysis: data.analysis as any, // Cast to any for Json type
      },
    });
  }

  async getServiceAnalysisBySession(sessionId: string) {
    return this.prisma.serviceAnalysis.findMany({
      where: { sessionId },
      include: {
        user: true,
        waiter: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getServiceAnalysisByWaiter(waiterId: string) {
    return this.prisma.serviceAnalysis.findMany({
      where: { waiterId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllServiceAnalysis() {
    return this.prisma.serviceAnalysis.findMany({
      include: {
        user: true,
        waiter: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
