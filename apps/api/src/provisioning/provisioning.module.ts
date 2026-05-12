import { Module } from '@nestjs/common';
import { ProvisioningService } from './provisioning.service';
import { EcsMockService } from './ecs-mock.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

@Module({
  imports: [OrchestratorModule],
  providers: [ProvisioningService, EcsMockService],
  exports: [ProvisioningService],
})
export class ProvisioningModule {}
