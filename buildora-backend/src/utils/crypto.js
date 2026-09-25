// AES-256-GCM for secrets stored in MongoDB (per-business WhatsApp tokens).
// Stored format: "v1:<iv>:<authTag>:<ciphertext>" (base64 parts).
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

function key() {
  const raw = env.tokenEncryptionKey || '';
  const buf = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new ApiError(503, 'TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64) on the server.');
  }
  return buf;
}

export function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), data].map((p) => (typeof p === 'string' ? p : p.toString('base64'))).join(':');
}

export function decryptSecret(stored) {
  const [version, iv, tag, data] = String(stored || '').split(':');
  if (version !== 'v1' || !data) throw new Error('Unknown secret format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}
