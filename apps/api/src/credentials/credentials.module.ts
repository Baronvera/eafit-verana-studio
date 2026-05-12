import { Module } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { CredentialsController } from './credentials.controller';
import { IssuanceService } from './issuance.service';
import { VerificationService } from './verification.service';

@Module({
  providers: [CredentialsService, IssuanceService, VerificationService],
  controllers: [CredentialsController],
  exports: [CredentialsService, IssuanceService, VerificationService],
})
export class CredentialsModule {}
