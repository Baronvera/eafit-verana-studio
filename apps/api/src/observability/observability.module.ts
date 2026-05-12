import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { AlertService } from './alert.service';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [AuthModule, BillingModule],
  providers: [MetricsService, AlertService],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class ObservabilityModule {}
