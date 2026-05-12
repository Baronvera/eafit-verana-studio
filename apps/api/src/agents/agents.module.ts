import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { DomainService } from './domain.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { ProvisioningModule } from '../provisioning/provisioning.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [OrchestratorModule, ProvisioningModule, AuthModule, BillingModule],
  providers: [AgentsService, DomainService],
  controllers: [AgentsController],
  exports: [AgentsService],
})
export class AgentsModule {}
