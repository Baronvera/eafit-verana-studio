import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.md', '.txt', '.csv', '.docx']);
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private orchestrator: OrchestratorService,
    @InjectQueue('knowledge-indexing') private indexingQueue: Queue,
  ) {}

  // ── Upload ──────────────────────────────────────────────────────────────

  async uploadDocument(
    userId: string,
    agentId: string,
    file: Express.Multer.File,
  ) {
    await this.assertAgentOwner(userId, agentId);
    this.validateFile(file);

    const docId = uuidv4();
    const s3Key = this.storage.buildKey(agentId, docId, file.originalname);

    // Subir a S3
    await this.storage.upload(s3Key, file.buffer, file.mimetype);

    // Guardar en DB con status UPLOADING → INDEXING
    const doc = await this.prisma.document.create({
      data: {
        id: docId,
        agentId,
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        s3Key,
        status: 'INDEXING',
      },
    });

    // Encolar indexado
    await this.indexingQueue.add(
      'index-document',
      { agentId, docId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    );

    this.logger.log(`Document enqueued for indexing: ${docId}`);
    return doc;
  }

  // ── List ────────────────────────────────────────────────────────────────

  async listDocuments(userId: string, agentId: string) {
    await this.assertAgentOwner(userId, agentId);
    return this.prisma.document.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────

  async deleteDocument(userId: string, agentId: string, docId: string) {
    await this.assertAgentOwner(userId, agentId);

    const doc = await this.prisma.document.findFirst({
      where: { id: docId, agentId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    await this.storage.delete(doc.s3Key);
    await this.prisma.document.delete({ where: { id: docId } });

    // Re-indexar el agente sin este documento
    await this.reindexAgent(agentId);

    return { deleted: true };
  }

  // ── Reindex ─────────────────────────────────────────────────────────────

  async reindexAll(userId: string, agentId: string) {
    await this.assertAgentOwner(userId, agentId);
    await this.reindexAgent(agentId);
    return { queued: true };
  }

  async reindexAgent(agentId: string) {
    await this.indexingQueue.add(
      'reindex-all',
      { agentId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    );
    this.logger.log(`Reindex queued for agent: ${agentId}`);
  }

  // ── RAG Config ──────────────────────────────────────────────────────────

  async buildRagRemoteUrls(agentId: string): Promise<string> {
    const docs = await this.prisma.document.findMany({
      where: { agentId, status: 'READY' },
    });

    const urls = await Promise.all(
      docs.map((doc) => this.storage.getSignedUrl(doc.s3Key)),
    );

    return urls.join(',');
  }

  async updateAgentRagConfig(agentId: string): Promise<void> {
    await this.buildRagRemoteUrls(agentId);

    // Actualizar env var en el contenedor y reiniciar AI agent
    await this.orchestrator.restartAiAgent(agentId).catch((err) => {
      this.logger.warn(`Could not restart AI agent ${agentId}: ${err.message}`);
    });

    this.logger.log(`RAG config updated for agent ${agentId}`);
  }

  // ── Cron: renovar URLs expiradas ────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async renewExpiredUrls() {
    this.logger.log('Running daily URL renewal cron...');

    const agents = await this.prisma.agent.findMany({
      where: { status: 'RUNNING' },
      select: { id: true },
    });

    for (const agent of agents) {
      const hasReadyDocs = await this.prisma.document.count({
        where: { agentId: agent.id, status: 'READY' },
      });
      if (hasReadyDocs > 0) {
        await this.reindexAgent(agent.id);
      }
    }

    this.logger.log(`URL renewal triggered for ${agents.length} agents`);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private validateFile(file: Express.Multer.File) {
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('El archivo supera el límite de 50MB');
    }

    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Formato no soportado. Usa: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
      );
    }
  }

  private async assertAgentOwner(userId: string, agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { org: { select: { userId: true } } },
    });
    if (!agent) throw new NotFoundException('Agente no encontrado');
    if (agent.org.userId !== userId) throw new ForbiddenException();
  }
}
