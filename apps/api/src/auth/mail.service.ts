import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const smtpHost = this.config.get('SMTP_HOST');
    if (smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(this.config.get('SMTP_PORT') || '587'),
        secure: this.config.get('SMTP_SECURE') === 'true',
        auth: {
          user: this.config.get('SMTP_USER'),
          pass: this.config.get('SMTP_PASS'),
        },
      });
    }
  }

  private get appUrl() {
    return this.config.get('APP_URL') || 'http://localhost:3001';
  }

  private get fromEmail() {
    return this.config.get('SMTP_FROM') || 'noreply@verana.io';
  }

  async sendEmailVerification(email: string, token: string, name?: string) {
    const url = `${this.appUrl}/auth/verify-email?token=${token}`;
    const subject = 'Verifica tu email — Verana Agent Studio';
    const html = `
      <h2>Hola${name ? ` ${name}` : ''}!</h2>
      <p>Gracias por registrarte en Verana Agent Studio. Verifica tu email haciendo clic en el enlace:</p>
      <p><a href="${url}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Verificar email</a></p>
      <p>Este enlace expira en 24 horas.</p>
      <p style="color:#6b7280;font-size:12px;">Si no te registraste, ignora este email.</p>
    `;
    await this.send(email, subject, html);
  }

  async sendPasswordReset(email: string, token: string, name?: string) {
    const url = `${this.appUrl}/auth/reset-password?token=${token}`;
    const subject = 'Recupera tu contraseña — Verana Agent Studio';
    const html = `
      <h2>Hola${name ? ` ${name}` : ''}!</h2>
      <p>Recibiste este email porque solicitaste restablecer tu contraseña.</p>
      <p><a href="${url}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Restablecer contraseña</a></p>
      <p>Este enlace expira en 2 horas.</p>
      <p style="color:#6b7280;font-size:12px;">Si no lo solicitaste, ignora este email.</p>
    `;
    await this.send(email, subject, html);
  }

  async sendInvitation(email: string, orgName: string, token: string, role: string) {
    const url = `${this.appUrl}/auth/accept-invite?token=${token}`;
    const subject = `Invitación a ${orgName} — Verana Agent Studio`;
    const html = `
      <h2>Te han invitado a ${orgName}</h2>
      <p>Has sido invitado a unirte a <strong>${orgName}</strong> como <strong>${role}</strong> en Verana Agent Studio.</p>
      <p><a href="${url}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Aceptar invitación</a></p>
      <p>Esta invitación expira en 48 horas.</p>
    `;
    await this.send(email, subject, html);
  }

  async sendAgentDownAlert(email: string, agentName: string, agentId: string) {
    const url = `${this.appUrl}/dashboard/agents/${agentId}`;
    const subject = `Alerta: agente "${agentName}" caído — Verana Agent Studio`;
    const html = `
      <h2>⚠️ Tu agente está caído</h2>
      <p>El agente <strong>${agentName}</strong> ha estado inactivo por más de 2 minutos.</p>
      <p><a href="${url}">Ver agente en el dashboard</a></p>
    `;
    await this.send(email, subject, html);
  }

  async sendUsageWarning(email: string, agentName: string, usagePercent: number) {
    const subject = `Alerta de uso al ${usagePercent}% — ${agentName}`;
    const html = `
      <h2>Uso elevado</h2>
      <p>El agente <strong>${agentName}</strong> ha alcanzado el <strong>${usagePercent}%</strong> de su límite mensual de conversaciones.</p>
      <p>Considera actualizar tu plan para evitar interrupciones.</p>
    `;
    await this.send(email, subject, html);
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      // Dev mode: log to console
      this.logger.debug(`📧 EMAIL TO: ${to} | SUBJECT: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({ from: this.fromEmail, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${(err as any).message}`);
    }
  }
}
