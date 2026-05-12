import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { MailService } from './mail.service';

export type OrgRole = 'OWNER' | 'EDITOR' | 'VIEWER';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mail: MailService,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────

  async register(
    email: string,
    password: string,
    name?: string,
    organization?: { name: string; country: string; registryId: string },
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email ya registrado');

    const passwordHash = await bcrypt.hash(password, 10);
    const emailVerifyToken = randomBytes(32).toString('hex');
    const emailVerifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await this.prisma.user.create({
      data: { email, passwordHash, name, emailVerifyToken, emailVerifyExpiresAt },
    });

    // Crear organización con NIT/RUT obligatorio al registrarse
    if (organization) {
      const org = await this.prisma.organization.create({
        data: {
          name: organization.name,
          country: organization.country,
          registryId: organization.registryId,
          userId: user.id,
        },
      });

      // Asignar al usuario como OWNER de su organización
      await this.prisma.orgMember.create({
        data: { userId: user.id, orgId: org.id, role: 'OWNER' },
      });
    }

    await this.mail.sendEmailVerification(email, emailVerifyToken, name);
    return this.issueTokens(user.id, user.email);
  }

  // ── Email Verification ────────────────────────────────────────────────────

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerifyToken: token },
    });
    if (!user || !user.emailVerifyExpiresAt || user.emailVerifyExpiresAt < new Date()) {
      throw new BadRequestException('Token de verificación inválido o expirado');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiresAt: null,
      },
    });

    return { message: 'Email verificado correctamente' };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerified) throw new BadRequestException('Email ya verificado');

    const emailVerifyToken = randomBytes(32).toString('hex');
    const emailVerifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifyToken, emailVerifyExpiresAt },
    });

    await this.mail.sendEmailVerification(user.email, emailVerifyToken, user.name ?? undefined);
    return { message: 'Email de verificación reenviado' };
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    return this.issueTokens(user.id, user.email);
  }

  // ── Password Reset ────────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to avoid email enumeration
    if (!user) return { message: 'Si el email existe recibirás un enlace' };

    const resetPasswordToken = randomBytes(32).toString('hex');
    const resetPasswordExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken, resetPasswordExpiresAt },
    });

    await this.mail.sendPasswordReset(email, resetPasswordToken, user.name ?? undefined);
    return { message: 'Si el email existe recibirás un enlace' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { resetPasswordToken: token },
    });
    if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt < new Date()) {
      throw new BadRequestException('Token de reset inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetPasswordToken: null, resetPasswordExpiresAt: null },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    return { message: 'Contraseña actualizada correctamente' };
  }

  // ── OAuth ─────────────────────────────────────────────────────────────────

  async oauthLogin(provider: string, oauthId: string, email: string, name?: string, avatarUrl?: string) {
    let user = await this.prisma.user.findFirst({
      where: { oauthProvider: provider, oauthId },
    });

    if (!user) {
      // Check if email already registered with password
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) {
        // Link OAuth to existing account
        user = await this.prisma.user.update({
          where: { id: existing.id },
          data: { oauthProvider: provider, oauthId, emailVerified: true, name: name ?? existing.name, avatarUrl: avatarUrl ?? existing.avatarUrl },
        });
      } else {
        user = await this.prisma.user.create({
          data: { email, oauthProvider: provider, oauthId, emailVerified: true, name, avatarUrl },
        });
      }
    }

    return this.issueTokens(user.id, user.email);
  }

  // ── Token Management ──────────────────────────────────────────────────────

  async refresh(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    await this.prisma.refreshToken.delete({ where: { token } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    return this.issueTokens(user.id, user.email);
  }

  async logout(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token } });
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, avatarUrl: true,
        emailVerified: true, oauthProvider: true,
        subscriptionStatus: true, createdAt: true,
        organizations: {
          include: { org: { select: { id: true, name: true, logoUrl: true } } },
        },
      },
    });
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string }) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) throw new BadRequestException('Cuenta OAuth no tiene contraseña');

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'Contraseña actualizada' };
  }

  // ── RBAC Guard Helpers ────────────────────────────────────────────────────

  async assertOrgRole(userId: string, orgId: string, minRole: OrgRole) {
    const member = await this.prisma.orgMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!member) throw new ForbiddenException('No perteneces a esta organización');

    const hierarchy: OrgRole[] = ['VIEWER', 'EDITOR', 'OWNER'];
    if (hierarchy.indexOf(member.role as OrgRole) < hierarchy.indexOf(minRole)) {
      throw new ForbiddenException(`Se requiere rol ${minRole} o superior`);
    }
    return member;
  }

  // ── Team / Invitations ────────────────────────────────────────────────────

  async inviteMember(invitedBy: string, orgId: string, email: string, role: OrgRole) {
    await this.assertOrgRole(invitedBy, orgId, 'EDITOR');

    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

    // Check if user already a member
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await this.prisma.orgMember.findUnique({
        where: { userId_orgId: { userId: existingUser.id, orgId } },
      });
      if (alreadyMember) throw new ConflictException('El usuario ya es miembro de la organización');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    await this.prisma.orgInvitation.create({
      data: { orgId, invitedBy, email, role, token, expiresAt },
    });

    await this.mail.sendInvitation(email, org.name, token, role);
    return { message: 'Invitación enviada' };
  }

  async acceptInvitation(token: string, userId: string) {
    const inv = await this.prisma.orgInvitation.findUnique({ where: { token } });
    if (!inv || inv.expiresAt < new Date() || inv.accepted) {
      throw new BadRequestException('Invitación inválida o expirada');
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.email !== inv.email) {
      throw new ForbiddenException('Esta invitación es para otro email');
    }

    await this.prisma.$transaction([
      this.prisma.orgMember.upsert({
        where: { userId_orgId: { userId, orgId: inv.orgId } },
        create: { userId, orgId: inv.orgId, role: inv.role },
        update: { role: inv.role },
      }),
      this.prisma.orgInvitation.update({
        where: { token },
        data: { accepted: true },
      }),
    ]);

    return { orgId: inv.orgId, role: inv.role };
  }

  async listMembers(requesterId: string, orgId: string) {
    await this.assertOrgRole(requesterId, orgId, 'VIEWER');

    const members = await this.prisma.orgMember.findMany({
      where: { orgId },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const invitations = await this.prisma.orgInvitation.findMany({
      where: { orgId, accepted: false, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return { members, invitations };
  }

  async removeMember(requesterId: string, orgId: string, memberId: string) {
    await this.assertOrgRole(requesterId, orgId, 'OWNER');

    if (requesterId === memberId) throw new BadRequestException('No puedes eliminarte a ti mismo');

    await this.prisma.orgMember.delete({
      where: { userId_orgId: { userId: memberId, orgId } },
    });
    return { removed: true };
  }

  async updateMemberRole(requesterId: string, orgId: string, memberId: string, role: OrgRole) {
    await this.assertOrgRole(requesterId, orgId, 'OWNER');

    return this.prisma.orgMember.update({
      where: { userId_orgId: { userId: memberId, orgId } },
      data: { role },
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
