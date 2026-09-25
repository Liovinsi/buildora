import { env, missingEmbeddedSignupConfig } from '../config/env.js';
import { Business } from '../models/Business.js';
import { Customer } from '../models/Customer.js';
import { Message } from '../models/Message.js';
import {
  exchangeCodeForToken,
  generatePin,
  getPhoneNumberInfo,
  getWabaPhoneNumbers,
  getWhatsAppCredentials,
  inspectToken,
  registerPhoneNumber,
  sendTextMessage,
  subscribeAppToWaba,
  unsubscribeAppFromWaba,
} from '../services/whatsapp.service.js';
import { ApiError } from '../utils/ApiError.js';
import { decryptSecret, encryptSecret } from '../utils/crypto.js';
import { isValidPhone, normalizePhone } from '../utils/phone.js';

const MAX_TEXT = 4096; // WhatsApp text body limit

const META_ID_RE = /^\d{5,25}$/; // Meta object IDs are long numeric strings

// Embedded Signup "FINISH" events we accept. Business-app (coexistence) numbers are already
// registered on the WhatsApp Business app and must not be re-registered.
const FINISH_EVENTS = ['FINISH', 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'];

/**
 * Connection status shown to the business owner. Deliberately excludes every technical value
 * (Phone Number ID, WABA ID, tokens, webhook URL): customers only see whether they're connected.
 */
export function publicWhatsAppStatus(business) {
  const wa = business.whatsapp || {};
  return {
    connected: Boolean(wa.connected),
    displayPhoneNumber: wa.displayPhoneNumber || '',
    verifiedName: wa.verifiedName || '',
    connectedAt: wa.connectedAt || null,
    needsReconnect: Boolean(wa.connected && wa.needsReconnect),
  };
}

// Public config to launch Embedded Signup in the browser. APP_ID and the configuration ID are
// public by design; the app secret and tokens never leave the server.
export function getConfig(req, res) {
  const missing = missingEmbeddedSignupConfig();
  res.json({
    success: true,
    data: {
      available: missing.length === 0,
      appId: env.meta.appId || '',
      configId: env.meta.embeddedSignupConfigId || '',
      apiVersion: env.meta.apiVersion,
    },
  });
}

export function getStatus(req, res) {
  res.json({ success: true, data: publicWhatsAppStatus(req.business) });
}

const optionalId = (value, label) => {
  const id = String(value ?? '').trim();
  if (id && !META_ID_RE.test(id)) throw ApiError.badRequest(`Invalid ${label} from Meta`);
  return id;
};

/**
 * Finish Embedded Signup for one business:
 * code -> business token -> verify which WABA it grants -> subscribe webhooks -> register number -> save.
 * The browser only sends the short-lived code (plus the IDs Meta's popup reported, as hints);
 * everything is re-verified server-side against Meta with the new token.
 */
export async function connect(req, res) {
  const business = req.business;
  const missing = missingEmbeddedSignupConfig();
  if (missing.length) {
    throw new ApiError(503, 'WhatsApp connection is not available yet. Please contact Buildora support.');
  }

  const code = String(req.body.code ?? '').trim();
  if (!code) throw ApiError.badRequest('Missing authorization from Meta. Please try connecting again.');
  const event = String(req.body.event || 'FINISH');
  if (!FINISH_EVENTS.includes(event)) {
    throw ApiError.badRequest('Please finish adding your WhatsApp number in the Meta window, then try again.');
  }
  const hintedWabaId = optionalId(req.body.wabaId, 'WhatsApp Business Account');
  const hintedPhoneId = optionalId(req.body.phoneNumberId, 'phone number');

  let accessToken;
  try {
    accessToken = await exchangeCodeForToken(code);
  } catch (err) {
    // Most common cause: the 30-second code expired or was already used.
    console.error(`[whatsapp] code exchange failed for business ${business._id}:`, err.message);
    throw ApiError.badRequest('The Meta connection expired before it could be completed. Please click Connect WhatsApp again.');
  }

  // Only trust WABAs the token was actually granted for.
  const { wabaIds, expiresAt } = await inspectToken(accessToken);
  const wabaId = hintedWabaId || (wabaIds.length === 1 ? wabaIds[0] : '');
  if (!wabaId || !wabaIds.includes(wabaId)) {
    throw ApiError.badRequest('We could not confirm your WhatsApp Business Account with Meta. Please try again.');
  }

  const numbers = await getWabaPhoneNumbers(wabaId, accessToken);
  const phone = hintedPhoneId ? numbers.find((n) => n.id === hintedPhoneId) : numbers.length === 1 ? numbers[0] : null;
  if (!phone) {
    throw ApiError.badRequest('We could not find the WhatsApp number you selected. Please try again and choose a number.');
  }

  const owner = await Business.findOne({ 'whatsapp.phoneNumberId': phone.id, _id: { $ne: business._id } }, 'name');
  if (owner) {
    throw ApiError.conflict('This WhatsApp number is already connected to another Buildora business.');
  }

  await subscribeAppToWaba(wabaId, accessToken);

  // Reuse our previous PIN when reconnecting the same number, so re-registration matches.
  const previous = await Business.findById(business._id).select('+whatsapp.registrationPinEncrypted').lean();
  const samePhone = previous?.whatsapp?.registeredPhoneNumberId === phone.id && previous?.whatsapp?.registrationPinEncrypted;
  const pin = samePhone ? decryptSecret(previous.whatsapp.registrationPinEncrypted) : generatePin();
  if (event === 'FINISH') {
    try {
      await registerPhoneNumber(phone.id, pin, accessToken);
    } catch (err) {
      console.error(`[whatsapp] register failed for business ${business._id}:`, err.message, err.details);
      const pinMismatch = [133005, 133006].includes(err.details?.metaCode);
      throw ApiError.badRequest(
        pinMismatch
          ? 'This number has two-step verification turned on. Turn it off in WhatsApp Manager (Phone numbers → Settings → Two-step verification), then connect again.'
          : `Meta could not activate this number for messaging: ${err.message}`
      );
    }
  }

  const info = await getPhoneNumberInfo(phone.id, accessToken).catch(() => phone);
  business.whatsapp = {
    connected: true,
    phoneNumberId: phone.id,
    businessAccountId: wabaId,
    displayPhoneNumber: info.display_phone_number || phone.display_phone_number || '',
    verifiedName: info.verified_name || phone.verified_name || '',
    verifiedWithMeta: true,
    connectedAt: new Date(),
    onboarding: 'embedded_signup',
    accessTokenEncrypted: encryptSecret(accessToken),
    registeredPhoneNumberId: phone.id,
    registrationPinEncrypted: encryptSecret(pin),
    tokenExpiresAt: expiresAt,
    needsReconnect: false,
  };
  await business.save();
  console.log(`[whatsapp] business ${business.slug} connected via Embedded Signup`);
  res.json({ success: true, data: publicWhatsAppStatus(business) });
}

export async function disconnect(req, res) {
  const business = req.business;
  const { businessAccountId: wabaId, connected } = business.whatsapp || {};

  // Stop Meta delivering this WABA's webhooks, unless another Buildora business still uses it.
  if (connected && wabaId) {
    const shared = await Business.exists({
      _id: { $ne: business._id },
      'whatsapp.connected': true,
      'whatsapp.businessAccountId': wabaId,
    });
    if (!shared) {
      try {
        const { accessToken } = await getWhatsAppCredentials(business, { allowNeedsReconnect: true });
        await unsubscribeAppFromWaba(wabaId, accessToken);
      } catch (err) {
        console.warn(`[whatsapp] could not unsubscribe WABA for business ${business._id}:`, err.message);
      }
    }
  }

  // Replacing the subdocument deletes the stored token and frees the number; only the
  // registration PIN is kept for a later reconnect of the same number.
  const stored = await Business.findById(business._id).select('+whatsapp.registrationPinEncrypted').lean();
  const { registeredPhoneNumberId, registrationPinEncrypted } = stored?.whatsapp || {};
  business.whatsapp = { connected: false, registeredPhoneNumberId, registrationPinEncrypted };
  await business.save();
  res.json({ success: true, data: publicWhatsAppStatus(business) });
}

export async function send(req, res) {
  const business = req.business;
  const text = String(req.body.message ?? '').trim();
  const phone = normalizePhone(req.body.customerPhone);

  if (!text) throw ApiError.badRequest('Message cannot be empty');
  if (text.length > MAX_TEXT) throw ApiError.badRequest(`Message is too long (max ${MAX_TEXT} characters)`);
  if (!isValidPhone(phone)) throw ApiError.badRequest('Invalid customer phone number');

  const credentials = await getWhatsAppCredentials(business);
  let whatsappMessageId;
  try {
    ({ whatsappMessageId } = await sendTextMessage({ ...credentials, to: phone, body: text }));
  } catch (err) {
    // Token revoked/expired: flag it so the WhatsApp page asks the owner to reconnect.
    if (err.details?.metaCode === 190) {
      await Business.updateOne({ _id: business._id }, { $set: { 'whatsapp.needsReconnect': true } });
    }
    throw err;
  }

  const now = new Date();
  const customer = await Customer.findOneAndUpdate(
    { businessId: business._id, phone },
    { $set: { lastMessageAt: now, lastMessage: text }, $setOnInsert: { businessId: business._id, phone } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const saved = await Message.create({
    businessId: business._id,
    customerId: customer._id,
    phone,
    direction: 'outgoing',
    message: text,
    type: 'text',
    whatsappMessageId,
    status: 'sent',
    timestamp: now,
  });

  res.status(201).json({ success: true, data: saved });
}
