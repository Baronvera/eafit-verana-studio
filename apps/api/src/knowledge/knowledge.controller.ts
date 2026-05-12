import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { KnowledgeService } from './knowledge.service';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

@ApiTags('knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents/:agentId/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Subir documento al agente (PDF, MD, TXT, CSV, DOCX)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @CurrentUser() user: JwtUser,
    @Param('agentId') agentId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.knowledge.uploadDocument(user.userId, agentId, file);
  }

  @Get()
  @ApiOperation({ summary: 'Listar documentos del agente con status' })
  list(@CurrentUser() user: JwtUser, @Param('agentId') agentId: string) {
    return this.knowledge.listDocuments(user.userId, agentId);
  }

  @Delete(':docId')
  @ApiOperation({ summary: 'Eliminar documento y re-indexar' })
  remove(
    @CurrentUser() user: JwtUser,
    @Param('agentId') agentId: string,
    @Param('docId') docId: string,
  ) {
    return this.knowledge.deleteDocument(user.userId, agentId, docId);
  }

  @Post('reindex')
  @ApiOperation({ summary: 'Forzar re-indexado completo de todos los documentos' })
  reindex(@CurrentUser() user: JwtUser, @Param('agentId') agentId: string) {
    return this.knowledge.reindexAll(user.userId, agentId);
  }
}
