import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import axios from 'axios';

const ALGORITHM = 'aes-256-gcm';
const KEY_HEX = process.env.ENCRYPTION_KEY || '0'.repeat(64); // 32 bytes en hex
const KEY = Buffer.from(KEY_HEX, 'hex');

@Injectable()
export class AuthManagerService {
  private readonly logger = new Logger(AuthManagerService.name);

  // ── Cifrado AES-256-GCM ──────────────────────────────────────────────

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Formato: iv:tag:encrypted (todos en hex)
    return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
  }

  decrypt(ciphertext: string): string {
    const [ivHex, tagHex, encHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }

  // ── Construir headers de autenticación ───────────────────────────────

  buildAuthHeaders(
    authType: string,
    encryptedCreds: string | null,
  ): Record<string, string> | undefined {
    if (!encryptedCreds || authType === 'NONE') return undefined;

    try {
      const creds = JSON.parse(this.decrypt(encryptedCreds));

      switch (authType.toUpperCase()) {
        case 'API_KEY':
          return { [creds.header || 'X-Api-Key']: creds.value };
        case 'BEARER':
          return { Authorization: `Bearer ${creds.token}` };
        case 'OAUTH2':
          return { Authorization: `Bearer ${creds.access_token}` };
        default:
          return undefined;
      }
    } catch (err: any) {
      this.logger.error(`Failed to build auth headers: ${err.message}`);
      return undefined;
    }
  }

  // ── OAuth2 Authorization Code Flow ────────────────────────────────────

  buildOAuth2AuthUrl(params: {
    authorizationUrl: string;
    clientId: string;
    redirectUri: string;
    scope: string;
    state: string;
  }): string {
    const url = new URL(params.authorizationUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('scope', params.scope);
    url.searchParams.set('state', params.state);
    return url.toString();
  }

  async exchangeOAuth2Code(params: {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    code: string;
    redirectUri: string;
  }): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
    const { data } = await axios.post(
      params.tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: params.clientId,
        client_secret: params.clientSecret,
        code: params.code,
        redirect_uri: params.redirectUri,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    return data;
  }

  async refreshOAuth2Token(params: {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  }): Promise<{ access_token: string; refresh_token?: string }> {
    const { data } = await axios.post(
      params.tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: params.clientId,
        client_secret: params.clientSecret,
        refresh_token: params.refreshToken,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    return data;
  }
}
