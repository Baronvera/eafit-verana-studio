import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LLMProvider } from '@vas/shared';

export class UpdateAgentDto {
  @IsString() @IsOptional() @ApiProperty({ required: false }) prompt?: string;
  @IsString() @IsOptional() @ApiProperty({ required: false }) model?: string;
  @IsEnum(LLMProvider) @IsOptional() @ApiProperty({ enum: LLMProvider, required: false }) llmProvider?: LLMProvider;
  @IsString() @IsOptional() @ApiProperty({ required: false }) llmApiKey?: string;
  @IsNumber() @IsOptional() @Min(0) @Max(2) @ApiProperty({ required: false }) temperature?: number;
  @IsString() @IsOptional() @ApiProperty({ required: false }) description?: string;
}
