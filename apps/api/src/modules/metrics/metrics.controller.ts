import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { MetricsService } from './metrics.service';

@Controller('metrics')
@UseGuards(SupabaseAuthGuard)
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('dashboard')
  getDashboard(@CurrentOrg() orgId: string) {
    return this.metricsService.getDashboardMetrics(orgId);
  }
}
