import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';

interface IndexDocumentJob {
  agentId: string;
  docId: string;
}

interface ReindexAllJob {
  agentId: string;
}

@Processor('knowledge-indexing')
export class IndexingProcessor {
  private readonly logger = new Logger(IndexingProcessor.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private orchestrator: OrchestratorService,
  ) {}

  // ── Indexar un documento nuevo ─────────────────────────────────────────

  @Process('index-document')
  async handleIndexDocument(job: Job<IndexDocumentJob>) {
    const { agentId, docId } = job.data;
    this.logger.log(`Indexing document ${docId} for agent ${agentId}`);

    // Marcar como INDEXING
    await this.prisma.document.update({
      where: { id: docId },
      data: { status: 'INDEXING' },
    });

    // Obtener todas las URLs firmadas de docs READY + este nuevo
    const allDocs = await this.prisma.document.findMany({
      where: { agentId, status: { in: ['READY', 'INDEXING'] } },
    });

    const urls = await Promise.all(
      allDocs.map((doc) => this.storage.getSignedUrl(doc.s3Key)),
    );

    const ragRemoteUrls = urls.join(',');
    this.logger.log(`RAG_REMOTE_URLS updated: ${urls.length} documents`);

    // Actualizar env var del contenedor y reiniciar AI agent
    // El hologram-generic-ai-agent-vs recarga RAG_REMOTE_URLS al arrancar
    await this.restartAiAgentWithNewUrls(agentId, ragRemoteUrls);

    // Marcar documento como READY
    await this.prisma.document.update({
      where: { id: docId },
      data: { status: 'READY', indexedAt: new Date() },
    });

    this.logger.log(`Document ${docId} indexed successfully`);
  }

  // ── Re-indexar todos los documentos del agente ─────────────────────────

  @Process('reindex-all')
  async handleReindexAll(job: Job<ReindexAllJob>) {
    const { agentId } = job.data;
    this.logger.log(`Re-indexing all documents for agent ${agentId}`);

    const docs = await this.prisma.document.findMany({
      where: { agentId, status: 'READY' },
    });

    if (docs.length === 0) {
      this.logger.log(`No ready documents for agent ${agentId}`);
      return;
    }

    const urls = await Promise.all(
      docs.map((doc) => this.storage.getSignedUrl(doc.s3Key)),
    );

    const ragRemoteUrls = urls.join(',');
    await this.restartAiAgentWithNewUrls(agentId, ragRemoteUrls);

    this.logger.log(`Re-index complete for agent ${agentId}: ${docs.length} docs`);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async restartAiAgentWithNewUrls(agentId: string, _ragRemoteUrls: string) {
    // En el futuro, esto actualizará las env vars del contenedor dinámicamente.
    // Por ahora: reinicio del ai-agent-vs (que lee RAG_REMOTE_URLS del env al arrancar).
    // La actualización real de env vars requiere recrear el contenedor o usar K8s ConfigMaps.
    await this.orchestrator.restartAiAgent(agentId).catch((err) => {
      this.logger.warn(`Could not restart AI agent: ${err.message}`);
    });
  }

  // ── Event handlers ─────────────────────────────────────────────────────

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.name} failed (attempt ${job.attemptsMade}): ${error.message}`);

    // Si el job es index-document y agotó reintentos → marcar como ERROR
    if (job.name === 'index-document' && job.attemptsMade >= (job.opts.attempts || 3)) {
      const { docId } = job.data as IndexDocumentJob;
      await this.prisma.document.update({
        where: { id: docId },
        data: { status: 'ERROR' },
      }).catch(() => {});
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.name} completed`);
  }
}
