import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { StorageService } from './storage.service';
import { IndexingProcessor } from './indexing.processor';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'knowledge-indexing' }),
    OrchestratorModule,
  ],
  providers: [KnowledgeService, StorageService, IndexingProcessor],
  controllers: [KnowledgeController],
  exports: [KnowledgeService, StorageService],
})
export class KnowledgeModule {}
