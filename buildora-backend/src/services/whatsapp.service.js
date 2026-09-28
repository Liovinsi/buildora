// Thin client for the Meta WhatsApp Cloud API. The only place that touches access tokens.
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { Business } from '../models/Business.js';
import { ApiError } from '../utils/ApiError.js';
import { decryptSecret } from '../utils/crypto.js';

// Friendlier text for the Meta error codes a small business is most likely to hit.
const FRIENDLY_ERRORS = {
  190: 'WhatsApp access for this business has expired or was removed. Please reconnect WhatsApp.',
  131047:
    'More than 24 hours have passed since this customer last messaged you. WhatsApp only allows free-form replies within 24 hours of their last message.',
  131026: 'This number cannot receive WhatsApp messages (not on WhatsApp or has an old app version).',
  131030:
    'This recipient is not in the allowed list for your test number. Add it in Meta Developer > WhatsApp > API Setup.',
  131056: 'Too many messages sent to this customer in a short time. Please wait a moment.',
  133010: 'This phone number is not registered with the WhatsApp Cloud API yet.',
};

/**
 * Credentials used to talk to Meta for one business: its own Embedded Signup token (decrypted
 * on demand, never cached or returned to clients). Businesses connected before Embedded Signup
 * fall back to the optional server META_ACCESS_TOKEN.
 */
export async function getWhatsAppCredentials(business, { allowNeedsReconnect = false } = {}) {
  const phoneNumberId = business?.whatsapp?.phoneNumberId;
  if (!business?.whatsapp?.connected || !phoneNumberId) {
    throw ApiError.badRequest('WhatsApp is not connected for this business.');
  }
  if (business.whatsapp.needsReconnect && !allowNeedsReconnect) {
    throw ApiError.badRequest(FRIENDLY_ERRORS[190]);
  }
  const stored = await Business.findById(business._id).select('+whatsapp.accessTokenEncrypted').lean();
  const encrypted = stored?.whatsapp?.accessTokenEncrypted;
  if (encrypted) return { accessToken: decryptSecret(encrypted), phoneNumberId };
  if (env.meta.accessToken) return { accessToken: env.meta.accessToken, phoneNumberId };
  throw new ApiError(503, 'WhatsApp credentials are missing for this business. Please reconnect WhatsApp.');
}

async function graphRequest(path, { method = 'GET', body, accessToken, query } = {}) {
  if (!accessToken) {
    throw new ApiError(503, 'WhatsApp credentials are missing for this business. Please reconnect WhatsApp.');
  }

  let res;
  try {
    const qs = query ? `?${new URLSearchParams(query)}` : '';
    res = await fetch(`${env.meta.graphUrl}/${env.meta.apiVersion}/${path}${qs}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.error('[whatsapp] network error:', err.message);
    throw new ApiError(502, 'Could not reach WhatsApp (Meta). Please try again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const e = data.error || {};
    console.error('[whatsapp] Meta API error:', JSON.stringify(e));
    const message =
      FRIENDLY_ERRORS[e.code] || e.error_data?.details || e.message || `Meta API error (HTTP ${res.status})`;
    throw new ApiError(res.status >= 500 ? 502 : 400, message, {
      metaCode: e.code,
      metaSubcode: e.error_subcode,
      fbtraceId: e.fbtrace_id,
    });
  }
  return data;
}

export function getPhoneNumberInfo(phoneNumberId, accessToken) {
  return graphRequest(encodeURIComponent(phoneNumberId), {
    accessToken,
    query: { fields: 'display_phone_number,verified_name' },
  });
}

export async function getWabaPhoneNumbers(wabaId, accessToken) {
  const data = await graphRequest(`${encodeURIComponent(wabaId)}/phone_numbers`, {
    accessToken,
    query: { fields: 'id,display_phone_number,verified_name', limit: '100' },
  });
  return data.data || [];
}

// ---- Embedded Signup onboarding (Tech Provider flow) ----

const appAccessToken = () => `${env.meta.appId}|${env.meta.appSecret}`;

/**
 * Exchange the 30-second code from FB.login for a business integration system user token.
 * Meta only accepts the exact redirect_uri the OAuth dialog used (else 100/36008). The JS SDK picks
 * that per call (its xd_arbiter relay URL); the browser captures it and sends it with the code.
 * Empty is kept as the fallback for clients that don't send one.
 */
export async function exchangeCodeForToken(code, redirectUri = '') {
  const data = await graphRequest('oauth/access_token', {
    accessToken: appAccessToken(),
    query: { client_id: env.meta.appId, client_secret: env.meta.appSecret, redirect_uri: redirectUri, code },
  });
  if (!data.access_token) throw new ApiError(502, 'Meta did not return an access token. Please try connecting again.');
  return data.access_token;
}

/**
 * Inspect a token with the app token. Returns the WABA IDs this token was granted for
 * (from granular scopes) so the server never has to trust IDs sent by the browser.
 */
export async function inspectToken(token) {
  const { data = {} } = await graphRequest('debug_token', {
    accessToken: appAccessToken(),
    query: { input_token: token },
  });
  if (!data.is_valid || String(data.app_id) !== String(env.meta.appId)) {
    throw ApiError.badRequest('Meta returned an invalid authorization. Please try connecting again.');
  }
  const wabaIds = new Set(
    (data.granular_scopes || [])
      .filter((s) => /^whatsapp_business_(management|messaging)$/.test(s.scope))
      .flatMap((s) => s.target_ids || [])
      .map(String)
  );
  return { wabaIds: [...wabaIds], expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : null };
}

/** Deliver this WABA's webhooks (messages, statuses) to the Buildora app. */
export function subscribeAppToWaba(wabaId, accessToken) {
  return graphRequest(`${encodeURIComponent(wabaId)}/subscribed_apps`, { method: 'POST', accessToken });
}

export function unsubscribeAppFromWaba(wabaId, accessToken) {
  return graphRequest(`${encodeURIComponent(wabaId)}/subscribed_apps`, { method: 'DELETE', accessToken });
}

export const generatePin = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

/** Register the number for Cloud API messaging. `pin` becomes its two-step verification PIN. */
export function registerPhoneNumber(phoneNumberId, pin, accessToken) {
  return graphRequest(`${encodeURIComponent(phoneNumberId)}/register`, {
    method: 'POST',
    accessToken,
    body: { messaging_product: 'whatsapp', pin },
  });
}

export async function sendTextMessage({ accessToken, phoneNumberId, to, body }) {
  const data = await graphRequest(`${encodeURIComponent(phoneNumberId)}/messages`, {
    method: 'POST',
    accessToken,
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body },
    },
  });
  const id = data.messages?.[0]?.id;
  if (!id) throw new ApiError(502, 'WhatsApp accepted the request but returned no message id.');
  return { whatsappMessageId: id };
}
