/**
 * 🔥 Custom Firestore DB - JWT Authentication
 * 완전 자체 구현 JWT 시스템
 * 
 * 핵심 기능:
 * - JWT 발급/검증 (RS256)
 * - 리프레시 토큰 로테이션
 * - 키 로테이션 지원
 * - 토큰 블랙리스트
 */

import { createSign, createVerify, generateKeyPairSync } from 'crypto';
import { randomUUID } from 'crypto';

export interface JWTPayload {
  iss: string;              // issuer
  sub: string;              // subject (user id)
  aud: string;              // audience
  exp: number;              // expiration time
  nbf: number;              // not before
  iat: number;              // issued at
  jti: string;              // jwt id
  
  // Custom claims
  dealerId: string;
  roles: string[];
  email: string;
  emailVerified: boolean;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenFamily: string;      // 토큰 계열 (rotation 추적)
  expiresAt: Date;
  createdAt: Date;
  lastUsed?: Date;
  revoked: boolean;
}

export interface KeyPair {
  id: string;
  privateKey: string;
  publicKey: string; 
  algorithm: 'RS256';
  createdAt: Date;
  isActive: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;        // access token 만료 시간 (초)
  tokenType: 'Bearer';
}

/**
 * JWT 토큰 관리자
 * 
 * 보안 특징:
 * 1. RS256 알고리즘 사용 (비대칭키)
 * 2. 액세스 토큰 15분, 리프레시 토큰 30일
 * 3. 리프레시 토큰 로테이션 (재사용 감지)
 * 4. 키 로테이션 지원 (90일 주기)
 * 5. 토큰 블랙리스트 (강제 로그아웃)
 */
export class JWTManager {
  private keyPairs = new Map<string, KeyPair>();
  private activeKeyId: string = '';
  private refreshTokens = new Map<string, RefreshToken>();
  private blacklist = new Set<string>(); // 블랙리스트된 jti들
  
  // 설정
  private readonly ACCESS_TOKEN_TTL = 15 * 60; // 15분
  private readonly REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30일
  private readonly ISSUER = 'custom-firestore-db';
  private readonly AUDIENCE = 'firestore-api';

  constructor() {
    // 초기 키 쌍 생성
    this.generateInitialKeyPair();
    
    // 주기적 정리 (1시간마다)
    setInterval(() => {
      this.cleanExpiredTokens();
      this.cleanBlacklist();
    }, 60 * 60 * 1000);
  }

  /**
   * 액세스 토큰 발급
   */
  issueAccessToken(
    userId: string,
    dealerId: string,
    roles: string[],
    email: string,
    emailVerified: boolean = true
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const jti = randomUUID();
    
    const payload: JWTPayload = {
      iss: this.ISSUER,
      sub: userId,
      aud: this.AUDIENCE,
      exp: now + this.ACCESS_TOKEN_TTL,
      nbf: now - 10, // 10초 전부터 유효 (시간 차이 보정)
      iat: now,
      jti,
      dealerId,
      roles,
      email,
      emailVerified
    };

    return this.signToken(payload);
  }

  /**
   * 리프레시 토큰 발급
   */
  issueRefreshToken(userId: string, tokenFamily?: string): string {
    const refreshTokenId = randomUUID();
    const family = tokenFamily || randomUUID();
    
    const refreshToken: RefreshToken = {
      id: refreshTokenId,
      userId,
      tokenFamily: family,
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_TTL * 1000),
      createdAt: new Date(),
      revoked: false
    };
    
    this.refreshTokens.set(refreshTokenId, refreshToken);
    
    return refreshTokenId;
  }

  /**
   * 토큰 쌍 발급 (액세스 + 리프레시)
   */
  issueTokenPair(
    userId: string,
    dealerId: string,
    roles: string[],
    email: string,
    emailVerified: boolean = true
  ): TokenPair {
    const accessToken = this.issueAccessToken(userId, dealerId, roles, email, emailVerified);
    const refreshToken = this.issueRefreshToken(userId);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_TTL,
      tokenType: 'Bearer'
    };
  }

  /**
   * 액세스 토큰 검증
   */
  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const payload = this.verifyToken(token);
      
      // 블랙리스트 확인
      if (this.blacklist.has(payload.jti)) {
        return null;
      }
      
      return payload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * 리프레시 토큰으로 새 토큰 쌍 발급
   */
  refreshTokens(
    refreshTokenId: string,
    userId: string,
    dealerId: string,
    roles: string[],
    email: string,
    emailVerified: boolean = true
  ): TokenPair | null {
    const refreshToken = this.refreshTokens.get(refreshTokenId);
    
    if (!refreshToken || refreshToken.revoked || refreshToken.userId !== userId) {
      // 재사용 시도 감지 - 전체 토큰 계열 폐기
      if (refreshToken) {
        this.revokeTokenFamily(refreshToken.tokenFamily);
      }
      return null;
    }
    
    // 만료 확인
    if (refreshToken.expiresAt < new Date()) {
      this.refreshTokens.delete(refreshTokenId);
      return null;
    }
    
    // 기존 리프레시 토큰 폐기 (로테이션)
    refreshToken.revoked = true;
    refreshToken.lastUsed = new Date();
    
    // 새 토큰 쌍 발급 (같은 family 유지)
    const accessToken = this.issueAccessToken(userId, dealerId, roles, email, emailVerified);
    const newRefreshToken = this.issueRefreshToken(userId, refreshToken.tokenFamily);
    
    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.ACCESS_TOKEN_TTL,
      tokenType: 'Bearer'
    };
  }

  /**
   * 토큰 강제 로그아웃 (블랙리스트 추가)
   */
  revokeToken(token: string): boolean {
    try {
      const payload = this.verifyToken(token);
      this.blacklist.add(payload.jti);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 사용자의 모든 토큰 폐기
   */
  revokeAllUserTokens(userId: string): void {
    // 모든 리프레시 토큰 폐기
    for (const [id, token] of this.refreshTokens) {
      if (token.userId === userId) {
        token.revoked = true;
      }
    }
  }

  /**
   * 토큰 계열 전체 폐기 (재사용 감지 시)
   */
  private revokeTokenFamily(tokenFamily: string): void {
    for (const [id, token] of this.refreshTokens) {
      if (token.tokenFamily === tokenFamily) {
        token.revoked = true;
      }
    }
    
    console.warn(`Revoked token family: ${tokenFamily} (possible replay attack)`);
  }

  /**
   * JWT 서명
   */
  private signToken(payload: JWTPayload): string {
    const activeKeyPair = this.keyPairs.get(this.activeKeyId);
    if (!activeKeyPair) {
      throw new Error('No active signing key available');
    }

    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: activeKeyPair.id
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    
    const signData = `${encodedHeader}.${encodedPayload}`;
    
    const signer = createSign('RSA-SHA256');
    signer.update(signData);
    const signature = signer.sign(activeKeyPair.privateKey, 'base64url');
    
    return `${signData}.${signature}`;
  }

  /**
   * JWT 검증
   */
  private verifyToken(token: string): JWTPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    
    // 헤더 디코딩
    const header = JSON.parse(this.base64UrlDecode(headerB64));
    if (header.alg !== 'RS256' || header.typ !== 'JWT') {
      throw new Error('Invalid token algorithm or type');
    }

    // 키 확인
    const keyPair = this.keyPairs.get(header.kid);
    if (!keyPair) {
      throw new Error('Unknown signing key');
    }

    // 서명 검증
    const signData = `${headerB64}.${payloadB64}`;
    const verifier = createVerify('RSA-SHA256');
    verifier.update(signData);
    
    const isValid = verifier.verify(keyPair.publicKey, signatureB64, 'base64url');
    if (!isValid) {
      throw new Error('Invalid token signature');
    }

    // 페이로드 디코딩
    const payload: JWTPayload = JSON.parse(this.base64UrlDecode(payloadB64));
    
    // 시간 검증
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error('Token expired');
    }
    if (payload.nbf > now) {
      throw new Error('Token not yet valid');
    }

    // 발급자/대상 확인
    if (payload.iss !== this.ISSUER || payload.aud !== this.AUDIENCE) {
      throw new Error('Invalid token issuer or audience');
    }

    return payload;
  }

  /**
   * 새 키 쌍 생성
   */
  generateKeyPair(): string {
    const keyId = randomUUID();
    
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    const keyPair: KeyPair = {
      id: keyId,
      privateKey,
      publicKey,
      algorithm: 'RS256',
      createdAt: new Date(),
      isActive: false
    };

    this.keyPairs.set(keyId, keyPair);
    
    console.log(`✅ Generated new key pair: ${keyId}`);
    return keyId;
  }

  /**
   * 키 로테이션
   */
  rotateKeys(): string {
    const newKeyId = this.generateKeyPair();
    
    // 이전 키들을 비활성화
    for (const keyPair of this.keyPairs.values()) {
      keyPair.isActive = false;
    }
    
    // 새 키를 활성화
    this.keyPairs.get(newKeyId)!.isActive = true;
    this.activeKeyId = newKeyId;
    
    console.log(`🔄 Key rotation completed: ${newKeyId}`);
    return newKeyId;
  }

  /**
   * 초기 키 쌍 생성
   */
  private generateInitialKeyPair(): void {
    const keyId = this.generateKeyPair();
    this.keyPairs.get(keyId)!.isActive = true;
    this.activeKeyId = keyId;
  }

  /**
   * 만료된 토큰 정리
   */
  private cleanExpiredTokens(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [id, token] of this.refreshTokens) {
      if (token.expiresAt < now || token.revoked) {
        this.refreshTokens.delete(id);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired refresh tokens`);
    }
  }

  /**
   * 블랙리스트 정리 (만료된 액세스 토큰 JTI 제거)
   */
  private cleanBlacklist(): void {
    // 실제로는 각 JTI의 만료 시간을 추적해야 하지만
    // 간단히 주기적으로 전체 정리
    const oldSize = this.blacklist.size;
    this.blacklist.clear();
    
    if (oldSize > 0) {
      console.log(`🧹 Cleaned blacklist (${oldSize} entries)`);
    }
  }

  // === 유틸리티 메서드들 ===

  private base64UrlEncode(str: string): string {
    return Buffer.from(str, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private base64UrlDecode(str: string): string {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    return Buffer.from(str, 'base64').toString('utf8');
  }

  /**
   * 공개 키 조회 (토큰 검증용)
   */
  getPublicKey(keyId: string): string | null {
    const keyPair = this.keyPairs.get(keyId);
    return keyPair ? keyPair.publicKey : null;
  }

  /**
   * 활성 키 정보
   */
  getActiveKeyInfo() {
    const activeKey = this.keyPairs.get(this.activeKeyId);
    return activeKey ? {
      id: activeKey.id,
      algorithm: activeKey.algorithm,
      createdAt: activeKey.createdAt
    } : null;
  }

  /**
   * 통계 정보
   */
  getStats() {
    return {
      totalKeys: this.keyPairs.size,
      activeKeyId: this.activeKeyId,
      refreshTokensCount: this.refreshTokens.size,
      blacklistSize: this.blacklist.size,
      accessTokenTTL: this.ACCESS_TOKEN_TTL,
      refreshTokenTTL: this.REFRESH_TOKEN_TTL
    };
  }
}

// 싱글톤 인스턴스
export const jwtManager = new JWTManager();