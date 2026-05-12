import {
  Controller, Get, Post, Delete, Patch,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsString, IsArray, IsEnum, IsOptional, IsBoolean, IsObject, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { CredentialsService, AttributeDef } from './credentials.service';
import { IssuanceService, ClaimMapping } from './issuance.service';
import { VerificationService, RequestedAttribute } from './verification.service';

// ── DTOs ──────────────────────────────────────────────────────────────────

class AttributeDefDto implements AttributeDef {
  @IsString() name: string;
  @IsEnum(['text', 'date', 'number', 'image']) type: 'text' | 'date' | 'number' | 'image';
}

class CreateCredTypeDto {
  @IsString() name: string;
  @IsString() @IsOptional() version?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => AttributeDefDto)
  attributes: AttributeDefDto[];
}

class ClaimMappingDto implements ClaimMapping {
  @IsString() attributeName: string;
  @IsEnum(['fixed', 'session', 'mcp_tool']) source: 'fixed' | 'session' | 'mcp_tool';
  @IsString() @IsOptional() value?: string;
  @IsString() @IsOptional() sessionKey?: string;
  @IsString() @IsOptional() toolKey?: string;
}

class CreateIssuanceFlowDto {
  @IsString() credTypeId: string;
  @IsEnum(['ON_CONNECT', 'ON_AUTH', 'ON_COMMAND']) triggerType: 'ON_CONNECT' | 'ON_AUTH' | 'ON_COMMAND';
  @IsString() @IsOptional() triggerCommand?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ClaimMappingDto)
  claimsMappings: ClaimMappingDto[];
  @IsBoolean() @IsOptional() active?: boolean;
}

class RequestedAttributeDto implements RequestedAttribute {
  @IsString() name: string;
  @IsString() credDefId: string;
  @IsArray() @IsOptional() restrictions?: Record<string, string>[];
}

class CreateVerificationFlowDto {
  @IsString() credDefId: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => RequestedAttributeDto)
  requestedAttributes: RequestedAttributeDto[];
  @IsString() @IsOptional() callbackUrl?: string;
  @IsEnum(['continue', 'block', 'custom_response']) postAction: 'continue' | 'block' | 'custom_response';
  @IsString() @IsOptional() customResponse?: string;
  @IsBoolean() @IsOptional() active?: boolean;
}

class ToggleDto {
  @IsBoolean() active: boolean;
}

class GenerateOfferDto {
  @IsString() flowId: string;
  @IsString() connectionId: string;
  @IsObject() @IsOptional() sessionContext?: Record<string, string>;
}

class GeneratePresentationDto {
  @IsString() flowId: string;
  @IsString() connectionId: string;
}

// ── Controller ────────────────────────────────────────────────────────────

@ApiTags('credentials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents/:agentId/credentials')
export class CredentialsController {
  constructor(
    private creds: CredentialsService,
    private issuance: IssuanceService,
    private verification: VerificationService,
  ) {}

  // ── Credential Types ──────────────────────────────────────────────────

  @Post('types')
  @ApiOperation({ summary: 'Crear tipo de credencial AnonCreds y registrar on-chain' })
  createType(
    @CurrentUser() u: JwtUser,
    @Param('agentId') agentId: string,
    @Body() dto: CreateCredTypeDto,
  ) {
    return this.creds.createCredentialType(u.userId, agentId, dto);
  }

  @Get('types')
  @ApiOperation({ summary: 'Listar tipos de credencial del agente' })
  listTypes(@CurrentUser() u: JwtUser, @Param('agentId') agentId: string) {
    return this.creds.listCredentialTypes(u.userId, agentId);
  }

  @Delete('types/:typeId')
  @ApiOperation({ summary: 'Eliminar tipo de credencial' })
  deleteType(
    @CurrentUser() u: JwtUser,
    @Param('agentId') agentId: string,
    @Param('typeId') typeId: string,
  ) {
    return this.creds.deleteCredentialType(u.userId, agentId, typeId);
  }

  // ── Issuance Flows ────────────────────────────────────────────────────

  @Post('issuance-flows')
  @ApiOperation({ summary: 'Crear flujo de emisión de credencial' })
  createFlow(
    @CurrentUser() u: JwtUser,
    @Param('agentId') agentId: string,
    @Body() dto: CreateIssuanceFlowDto,
  ) {
    return this.issuance.createFlow(agentId, dto);
  }

  @Get('issuance-flows')
  @ApiOperation({ summary: 'Listar flujos de emisión' })
  listFlows(@Param('agentId') agentId: string) {
    return this.issuance.listFlows(agentId);
  }

  @Patch('issuance-flows/:flowId/toggle')
  @ApiOperation({ summary: 'Activar / desactivar flujo de emisión' })
  toggleFlow(
    @Param('agentId') agentId: string,
    @Param('flowId') flowId: string,
    @Body() dto: ToggleDto,
  ) {
    return this.issuance.toggleFlow(agentId, flowId, dto.active);
  }

  @Delete('issuance-flows/:flowId')
  @ApiOperation({ summary: 'Eliminar flujo de emisión' })
  deleteFlow(@Param('agentId') agentId: string, @Param('flowId') flowId: string) {
    return this.issuance.deleteFlow(agentId, flowId);
  }

  @Post('offers')
  @ApiOperation({ summary: 'Generar oferta de credencial para una conexión' })
  generateOffer(@Param('agentId') agentId: string, @Body() dto: GenerateOfferDto) {
    return this.issuance.generateCredentialOffer(
      agentId, dto.flowId, dto.connectionId, dto.sessionContext,
    );
  }

  @Get('offers/:offerId')
  @ApiOperation({ summary: 'Estado de una oferta de credencial' })
  getOfferStatus(@Param('agentId') agentId: string, @Param('offerId') offerId: string) {
    return this.issuance.getOfferStatus(agentId, offerId);
  }

  // ── Verification Flows ────────────────────────────────────────────────

  @Post('verification-flows')
  @ApiOperation({ summary: 'Crear flujo de verificación con selective disclosure' })
  createVerFlow(
    @Param('agentId') agentId: string,
    @Body() dto: CreateVerificationFlowDto,
  ) {
    return this.verification.createFlow(agentId, dto);
  }

  @Get('verification-flows')
  @ApiOperation({ summary: 'Listar flujos de verificación' })
  listVerFlows(@Param('agentId') agentId: string) {
    return this.verification.listFlows(agentId);
  }

  @Patch('verification-flows/:flowId/toggle')
  @ApiOperation({ summary: 'Activar / desactivar flujo de verificación' })
  toggleVerFlow(
    @Param('agentId') agentId: string,
    @Param('flowId') flowId: string,
    @Body() dto: ToggleDto,
  ) {
    return this.verification.toggleFlow(agentId, flowId, dto.active);
  }

  @Delete('verification-flows/:flowId')
  deleteVerFlow(@Param('agentId') agentId: string, @Param('flowId') flowId: string) {
    return this.verification.deleteFlow(agentId, flowId);
  }

  @Post('presentation-requests')
  @ApiOperation({ summary: 'Solicitar presentación de credencial a una conexión' })
  generatePresentation(@Param('agentId') agentId: string, @Body() dto: GeneratePresentationDto) {
    return this.verification.generatePresentationRequest(agentId, dto.flowId, dto.connectionId);
  }

  // Webhook llamado por vs-agent cuando Hologram presenta la credencial
  @Post('verification-callback')
  @ApiOperation({ summary: 'Webhook de resultado de verificación (llamado por vs-agent)' })
  verificationCallback(@Param('agentId') agentId: string, @Body() payload: any) {
    return this.verification.handleVerificationCallback(agentId, payload);
  }

  // ── Emitidas & Revocación ─────────────────────────────────────────────

  @Get('issued')
  @ApiOperation({ summary: 'Listar credenciales emitidas por el agente' })
  listIssued(@CurrentUser() u: JwtUser, @Param('agentId') agentId: string) {
    return this.creds.listIssuedCredentials(u.userId, agentId);
  }

  @Post('issued/:credId/revoke')
  @ApiOperation({ summary: 'Revocar credencial individual' })
  revoke(
    @CurrentUser() u: JwtUser,
    @Param('agentId') agentId: string,
    @Param('credId') credId: string,
  ) {
    return this.creds.revokeCredential(u.userId, agentId, credId);
  }

  @Post('revoke-by-type')
  @ApiOperation({ summary: 'Revocar todas las credenciales de un tipo (credDefId)' })
  revokeByType(
    @CurrentUser() u: JwtUser,
    @Param('agentId') agentId: string,
    @Body('credDefId') credDefId: string,
  ) {
    return this.creds.revokeByType(u.userId, agentId, credDefId);
  }

  // ── Stats ─────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de credenciales del agente' })
  stats(@CurrentUser() u: JwtUser, @Param('agentId') agentId: string) {
    return this.creds.getStats(u.userId, agentId);
  }
}
