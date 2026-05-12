import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AgentNetwork, LLMProvider } from '@vas/shared';

class OrganizationDto {
  @IsString() @ApiProperty() name: string;
  @IsString() @ApiProperty({ example: 'ES' }) country: string;
  @IsString() @IsOptional() @ApiProperty({ required: false }) registryId?: string;
}

class ServiceDto {
  @IsUrl() @IsOptional() @ApiProperty({ required: false }) termsUrl?: string;
  @IsUrl() @IsOptional() @ApiProperty({ required: false }) privacyUrl?: string;
}

export class CreateAgentDto {
  @IsString() @ApiProperty() name: string;
  @IsString() @IsOptional() @ApiProperty({ required: false }) type?: string;
  @IsString() @IsOptional() @ApiProperty({ required: false }) description?: string;

  @IsEnum(AgentNetwork) @ApiProperty({ enum: AgentNetwork }) network: AgentNetwork;
  @IsEnum(LLMProvider) @ApiProperty({ enum: LLMProvider }) llmProvider: LLMProvider;
  @IsString() @ApiProperty({ example: 'claude-3-5-haiku-20241022' }) model: string;
  @IsString() @ApiProperty() llmApiKey: string;
  @IsString() @ApiProperty() prompt: string;
  @IsNumber() @IsOptional() @Min(0) @Max(2) @ApiProperty({ required: false, default: 0.7 }) temperature?: number;

  @IsOptional() @ApiProperty({ required: false }) selectedMcps?: string[];
  @IsString() @IsOptional() @ApiProperty({ required: false }) googleMapsApiKey?: string;
  @IsString() @IsOptional() @ApiProperty({ required: false }) tavilyApiKey?: string;
  @IsString() @IsOptional() @ApiProperty({ required: false }) twitterApiKey?: string;
  @IsString() @IsOptional() @ApiProperty({ required: false }) googleClientId?: string;
  @IsString() @IsOptional() @ApiProperty({ required: false }) googleClientSecret?: string;

  @ValidateNested() @Type(() => OrganizationDto) @ApiProperty({ type: OrganizationDto })
  organization: OrganizationDto;

  @ValidateNested() @Type(() => ServiceDto) @ApiProperty({ type: ServiceDto })
  service: ServiceDto;
}
