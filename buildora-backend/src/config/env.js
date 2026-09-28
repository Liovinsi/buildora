import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const list = (value) =>
  (value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

// Meta app / configuration IDs are numeric. Tolerate stray whitespace or quotes pasted into the env.
const metaId = (value) => (value || '').trim().replace(/^(['"])(.*)\1$/, '$2').trim() || undefined;
const isMetaId = (value) => /^\d+$/.test(value || '');

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  // Comma-separated list of allowed frontend origins. Empty = allow all (dev only).
  corsOrigins: list(process.env.CORS_ORIGINS),
  // Public base URL of THIS backend, used only to display the webhook callback URL.
  publicUrl: (process.env.PUBLIC_BACKEND_URL || '').replace(/\/+$/, ''),
  meta: {
    // One Buildora Meta app serves every business. APP_ID and EMBEDDED_SIGNUP_CONFIG_ID are public (sent to the
    // browser to launch Embedded Signup); APP_SECRET never leaves the server.
    appId: metaId(process.env.META_APP_ID),
    embeddedSignupConfigId: metaId(process.env.EMBEDDED_SIGNUP_CONFIG_ID),
    // Optional legacy/dev fallback: only used for businesses connected before Embedded Signup
    // (no per-business token stored). New connections always use their own business token.
    accessToken: process.env.META_ACCESS_TOKEN,
    phoneNumberId: process.env.META_PHONE_NUMBER_ID,
    wabaId: process.env.META_WABA_ID,
    verifyToken: process.env.META_VERIFY_TOKEN,
    apiVersion: process.env.META_API_VERSION || 'v23.0',
    // Only overridden by the automated tests (local mock of the Graph API).
    graphUrl: (process.env.META_GRAPH_URL || 'https://graph.facebook.com').replace(/\/+$/, ''),
    // Optional. When set, incoming webhook POSTs must carry a valid X-Hub-Signature-256.
    appSecret: process.env.META_APP_SECRET,
  },
  // Encrypts per-business WhatsApp tokens at rest (32 bytes, hex or base64).
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
};

export const missingEmbeddedSignupConfig = () =>
  [
    ['META_APP_ID', isMetaId(env.meta.appId)],
    ['META_APP_SECRET', env.meta.appSecret],
    ['EMBEDDED_SIGNUP_CONFIG_ID', isMetaId(env.meta.embeddedSignupConfigId)],
    ['TOKEN_ENCRYPTION_KEY', env.tokenEncryptionKey],
  ]
    .filter(([, ok]) => !ok)
    .map(([key]) => key);

export function validateEnv() {
  if (!env.mongoUri) {
    throw new Error('MONGO_URI is not set. Copy .env.example to .env and fill it in.');
  }
  const missing = missingEmbeddedSignupConfig();
  if (!env.meta.verifyToken) missing.push('META_VERIFY_TOKEN');
  if (missing.length) {
    console.warn(`[env] WhatsApp Embedded Signup disabled until set: ${missing.join(', ')}`);
    if (env.meta.appId && !isMetaId(env.meta.appId)) {
      console.warn('[env] META_APP_ID must be the numeric App ID from Meta App settings > Basic');
    }
  }
  if (!env.meta.appSecret) {
    console.warn('[env] META_APP_SECRET not set - webhook signature verification is OFF');
  }
}
