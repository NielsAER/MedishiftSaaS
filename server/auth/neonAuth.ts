import * as jose from 'jose';
import type { RequestHandler } from 'express';
import { storage } from '../storage';

const NEON_AUTH_URL = process.env.NEON_AUTH_URL!;
const isLocalDev = process.env.NODE_ENV === 'development' && !process.env.NEON_AUTH_URL;

// JWKS for JWT verification
let jwksCache: jose.JWTVerifyGetKey | null = null;

function getJWKS() {
  if (!jwksCache) {
    jwksCache = jose.createRemoteJWKSet(
      new URL(`${NEON_AUTH_URL}/.well-known/jwks.json`)
    );
  }
  return jwksCache;
}

// Verify JWT token from Neon Auth
async function verifyNeonAuthToken(token: string) {
  try {
    const jwks = getJWKS();
    const { payload } = await jose.jwtVerify(token, jwks);
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export { verifyNeonAuthToken };