// src/utils/token.util.ts
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { config } from '../config/config';
import type { TokenPayload } from '../types/auth.types';

/**
 * เราใช้ @fastify/jwt ผ่าน Fastify instance แทน jsonwebtoken ตรง ๆ
 * ต้องเรียก bindJwt(app) หลังจาก register(@fastify/jwt) ใน server.ts
 */

let appRef: FastifyInstance | undefined;

export function bindJwt(app: FastifyInstance) {
  appRef = app;
}

function app(): FastifyInstance {
  if (!appRef) {
    throw new Error(
      'JWT not initialized: call bindJwt(app) after registering @fastify/jwt.'
    );
  }
  return appRef;
}

const ISSUER = 'microplate-auth-service';
const AUDIENCE = 'microplate-api';

/**
 * Generate access token
 */
export class TokenUtil {
  static generateAccessToken(
    payload: Omit<TokenPayload, 'iat' | 'exp' | 'jti' | 'type'>
  ): string {
    return app().jwt.sign(
      { 
        ...payload, 
        type: 'access',
        iss: ISSUER,
        aud: AUDIENCE
      },
      {
        expiresIn: config.tokenExpiryAccess as any
      }
    );
  }

  /**
   * Generate refresh token (มี jti สำหรับ rotation)
   */
  static generateRefreshToken(
    payload: Omit<TokenPayload, 'iat' | 'exp' | 'type'>
  ): string {
    return app().jwt.sign(
      { 
        ...payload, 
        jti: randomUUID(), 
        type: 'refresh',
        iss: ISSUER,
        aud: AUDIENCE
      },
      {
        expiresIn: config.tokenExpiryRefresh as any
      }
    );
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = app().jwt.verify<TokenPayload>(token);
      if (decoded.type !== 'access' || decoded.iss !== ISSUER || decoded.aud !== AUDIENCE) {
        throw new Error('INVALID_TOKEN_TYPE');
      }
      return decoded;
    } catch (err: any) {
      if (err?.code === 'FAST_JWT_EXPIRED' || err?.message === 'Token expired') {
        throw new Error('TOKEN_EXPIRED');
      }
      throw new Error('INVALID_TOKEN');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): TokenPayload {
    try {
      const decoded = app().jwt.verify<TokenPayload>(token);
      if (decoded.type !== 'refresh' || decoded.iss !== ISSUER || decoded.aud !== AUDIENCE) {
        throw new Error('INVALID_TOKEN_TYPE');
      }
      return decoded;
    } catch (err: any) {
      if (err?.code === 'FAST_JWT_EXPIRED' || err?.message === 'Token expired') {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }
      throw new Error('INVALID_REFRESH_TOKEN');
    }
  }

  /**
   * Decode (no verify)
   */
  static decodeToken(token: string): any {
    return app().jwt.decode(token);
  }

  /**
   * Expiration datetime
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = app().jwt.decode<{ exp?: number }>(token);
      if (decoded?.exp) return new Date(decoded.exp * 1000);
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Expired check
   */
  static isTokenExpired(token: string): boolean {
    const exp = this.getTokenExpiration(token);
    return !exp || exp < new Date();
  }

  /**
   * Token family id (สำหรับ rotation)
   */
  static generateTokenFamily(): string {
    return randomUUID();
  }

  /**
   * Extract jti
   */
  static getTokenId(token: string): string | null {
    try {
      const decoded = app().jwt.decode<{ jti?: string }>(token);
      return decoded?.jti ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Password reset token
   */
  static generatePasswordResetToken(userId: string): string {
    const payload = {
      sub: userId,
      jti: randomUUID(),
      type: 'password_reset' as const,
      iss: ISSUER,
      aud: AUDIENCE
    };
    return app().jwt.sign(payload, {
      expiresIn: config.passwordResetExpiry as any
    });
  }

  static verifyPasswordResetToken(token: string): { userId: string; jti: string } {
    try {
      const decoded = app().jwt.verify<TokenPayload>(token);
      if (decoded.type !== 'password_reset' || decoded.iss !== ISSUER || decoded.aud !== AUDIENCE) {
        throw new Error('INVALID_TOKEN_TYPE');
      }
      return { userId: decoded.sub, jti: decoded.jti! };
    } catch (err: any) {
      if (err?.code === 'FAST_JWT_EXPIRED' || err?.message === 'Token expired') {
        throw new Error('PASSWORD_RESET_TOKEN_EXPIRED');
      }
      throw new Error('INVALID_PASSWORD_RESET_TOKEN');
    }
  }
}
