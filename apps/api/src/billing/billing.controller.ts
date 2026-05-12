import {
  Controller, Get, Post, Body, Req, Res,
  UseGuards, RawBodyRequest,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { BillingService, PlanName } from './billing.service';

class CreateCheckoutDto {
  @IsEnum(['pro', 'enterprise']) plan: PlanName;
  @IsString() successUrl: string;
  @IsString() cancelUrl: string;
}

class BillingPortalDto {
  @IsString() returnUrl: string;
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private billing: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Listar planes disponibles' })
  getPlans() {
    return this.billing.getPlans();
  }

  @Get('usage')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Uso actual del plan' })
  getUsage(@CurrentUser() u: JwtUser) {
    return this.billing.getUsage(u.userId);
  }

  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear sesión de checkout Stripe' })
  createCheckout(@CurrentUser() u: JwtUser, @Body() dto: CreateCheckoutDto) {
    return this.billing.createCheckoutSession(u.userId, dto.plan, dto.successUrl, dto.cancelUrl);
  }

  @Post('portal')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Abrir portal de facturación Stripe' })
  createPortal(@CurrentUser() u: JwtUser, @Body() dto: BillingPortalDto) {
    return this.billing.createBillingPortalSession(u.userId, dto.returnUrl);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook de Stripe (llamado por Stripe)' })
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    try {
      const result = await this.billing.handleWebhook(req.rawBody!, sig);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as any).message });
    }
  }
}
