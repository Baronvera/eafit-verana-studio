import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { HelmOrchestratorService } from './helm-orchestrator.service';

@Module({
  providers: [OrchestratorService, HelmOrchestratorService],
  exports: [OrchestratorService, HelmOrchestratorService],
})
export class OrchestratorModule {}
