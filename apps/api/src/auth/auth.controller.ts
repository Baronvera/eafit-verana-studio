import {
  Controller, Post, Get, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsString, IsEmail, IsOptional, IsEnum, MinLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, JwtUser } from './current-user.decorator';
import { AuthService, OrgRole } from './auth.service';

class OrgRegisterDto {
  @IsString() name: string;
  @IsString() country: string;
  @IsString() registryId: string; // NIT / RUT — obligatorio
}

class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @IsOptional() name?: string;
  @ValidateNested() @Type(() => OrgRegisterDto) organization: OrgRegisterDto;
}

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

class RefreshDto {
  @IsString() refreshToken: string;
}

class ForgotPasswordDto {
  @IsEmail() email: string;
}

class ResetPasswordDto {
  @IsString() token: string;
  @IsString() @MinLength(8) newPassword: string;
}

class UpdateProfileDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() avatarUrl?: string;
}

class ChangePasswordDto {
  @IsString() oldPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}

class InviteMemberDto {
  @IsEmail() email: string;
  @IsEnum(['OWNER', 'EDITOR', 'VIEWER']) role: OrgRole;
}

class UpdateRoleDto {
  @IsEnum(['OWNER', 'EDITOR', 'VIEWER']) role: OrgRole;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registro con email + password + organización (NIT/RUT obligatorio)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.name, dto.organization);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login con email + password' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revocar refresh token' })
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  // ── Email verification ────────────────────────────────────────────────────

  @Get('verify-email')
  @ApiOperation({ summary: 'Verificar email con token' })
  verifyEmail(@Query('token') token: string) {
    return this.auth.verifyEmail(token);
  }

  @Post('resend-verification')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reenviar email de verificación' })
  resendVerification(@CurrentUser() u: JwtUser) {
    return this.auth.resendVerification(u.userId);
  }

  // ── Password reset ────────────────────────────────────────────────────────

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar reset de contraseña' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña con token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener perfil del usuario' })
  getProfile(@CurrentUser() u: JwtUser) {
    return this.auth.getProfile(u.userId);
  }

  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar perfil' })
  updateProfile(@CurrentUser() u: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(u.userId, dto);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cambiar contraseña' })
  changePassword(@CurrentUser() u: JwtUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(u.userId, dto.oldPassword, dto.newPassword);
  }

  // ── Team management ───────────────────────────────────────────────────────

  @Get('orgs/:orgId/members')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar miembros de la organización' })
  listMembers(@CurrentUser() u: JwtUser, @Param('orgId') orgId: string) {
    return this.auth.listMembers(u.userId, orgId);
  }

  @Post('orgs/:orgId/invite')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Invitar miembro a la organización' })
  invite(
    @CurrentUser() u: JwtUser,
    @Param('orgId') orgId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.auth.inviteMember(u.userId, orgId, dto.email, dto.role);
  }

  @Post('accept-invite')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Aceptar invitación con token' })
  acceptInvite(@CurrentUser() u: JwtUser, @Query('token') token: string) {
    return this.auth.acceptInvitation(token, u.userId);
  }

  @Delete('orgs/:orgId/members/:memberId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Eliminar miembro de la organización' })
  removeMember(
    @CurrentUser() u: JwtUser,
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.auth.removeMember(u.userId, orgId, memberId);
  }

  @Patch('orgs/:orgId/members/:memberId/role')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cambiar rol de un miembro' })
  updateRole(
    @CurrentUser() u: JwtUser,
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.auth.updateMemberRole(u.userId, orgId, memberId, dto.role);
  }
}
