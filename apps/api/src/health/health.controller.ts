import { Controller, Get } from '@nestjs/common';
import { 
  HealthCheck, 
  HealthCheckService, 
  HttpHealthIndicator, 
  HealthCheckResult 
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check API health status' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Basic HTTP ping check - the API is responding
      () => this.http.pingCheck('api', 'http://localhost:3001/api/v1'),
      
      // Additional health indicators will be added in Phase 2
      // - Database connection
      // - Redis (if implemented)
      // - External services
    ]);
  }
}
