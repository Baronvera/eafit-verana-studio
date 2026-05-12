import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ObservabilityModule } from '../observability/observability.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [ObservabilityModule, BillingModule],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
