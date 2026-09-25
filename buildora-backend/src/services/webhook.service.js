// Turns Meta webhook payloads into Customers and Messages, routed to the right Business.
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { Business } from '../models/Business.js';
import { Customer } from '../models/Customer.js';
import { Message } from '../models/Message.js';
import { normalizePhone } from '../utils/phone.js';

export function isValidSignature(rawBody, signatureHeader) {
  if (!env.meta.appSecret) return true; // verification disabled
  if (!rawBody || !signatureHeader?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', env.meta.appSecret).update(rawBody).digest('hex');
  const given = signatureHeader.slice('sha256='.length);
  return (
    given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given, 'hex'), Buffer.from(expected, 'hex'))
  );
}

const TYPE_LABELS = {
  image: 'Photo',
  video: 'Video',
  audio: 'Voice message',
  document: 'Document',
  sticker: 'Sticker',
  location: 'Location',
  contacts: 'Contact',
  reaction: 'Reaction',
};

// Best-effort readable text for any WhatsApp message type. Media download is out of scope for V1.
export function extractText(msg) {
  switch (msg.type) {
    case 'text':
      return msg.text?.body || '';
    case 'button':
      return msg.button?.text || '';
    case 'interactive':
      return msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '[Interactive reply]';
    case 'reaction':
      return `[Reaction] ${msg.reaction?.emoji || ''}`.trim();
    case 'location': {
      const l = msg.location || {};
      return `[Location] ${l.name || l.address || `${l.latitude}, ${l.longitude}`}`;
    }
    default: {
      const label = TYPE_LABELS[msg.type] || 'Unsupported message';
      const caption = msg[msg.type]?.caption;
      return caption ? `[${label}] ${caption}` : `[${label}]`;
    }
  }
}

async function handleIncomingMessage(business, msg, contacts) {
  const phone = normalizePhone(msg.from);
  const contact = contacts?.find((c) => normalizePhone(c.wa_id) === phone);
  const name = contact?.profile?.name;
  const timestamp = msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date();
  const text = extractText(msg);

  const customer = await Customer.findOneAndUpdate(
    { businessId: business._id, phone },
    { ...(name && { $set: { name } }), $setOnInsert: { businessId: business._id, phone } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  try {
    await Message.create({
      businessId: business._id,
      customerId: customer._id,
      phone,
      direction: 'incoming',
      message: text,
      type: msg.type,
      whatsappMessageId: msg.id,
      status: 'received',
      timestamp,
    });
  } catch (err) {
    if (err.code === 11000) return; // Meta retry of a message we already stored
    throw err;
  }

  await Customer.updateOne({ _id: customer._id }, { $inc: { unreadCount: 1 } });
  await Customer.updateOne(
    { _id: customer._id, $or: [{ lastMessageAt: null }, { lastMessageAt: { $lte: timestamp } }] },
    { $set: { lastMessageAt: timestamp, lastMessage: text } }
  );
  console.log(`[webhook] message from ${phone} -> business ${business.slug}`);
}

// Statuses can arrive out of order; never downgrade (e.g. read -> delivered).
const STATUS_RANK = { sending: 0, sent: 1, delivered: 2, read: 3 };

async function handleStatus(business, status) {
  const next = status.status; // sent | delivered | read | failed
  const lowerStatuses = Object.keys(STATUS_RANK).filter((s) => STATUS_RANK[s] < (STATUS_RANK[next] ?? -1));
  const filter = { businessId: business._id, whatsappMessageId: status.id };

  if (next === 'failed') {
    const reason = status.errors?.[0];
    await Message.updateOne(filter, {
      $set: { status: 'failed', error: reason?.error_data?.details || reason?.title || reason?.message || 'Failed' },
    });
  } else if (next in STATUS_RANK) {
    await Message.updateOne({ ...filter, status: { $in: lowerStatuses } }, { $set: { status: next } });
  }
}

/** Process a full webhook body. Returns counts; per-item errors are logged, not thrown. */
export async function processWebhook(body) {
  const result = { messages: 0, statuses: 0, skipped: 0, errors: 0 };
  if (body?.object !== 'whatsapp_business_account') return result;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id;

      const business = phoneNumberId
        ? await Business.findOne({ 'whatsapp.phoneNumberId': phoneNumberId, 'whatsapp.connected': true })
        : null;
      if (!business) {
        const count = (value.messages?.length || 0) + (value.statuses?.length || 0);
        result.skipped += count;
        console.warn(`[webhook] no connected business for phone_number_id=${phoneNumberId}; ignored ${count} event(s)`);
        continue;
      }

      for (const msg of value.messages || []) {
        try {
          await handleIncomingMessage(business, msg, value.contacts);
          result.messages++;
        } catch (err) {
          result.errors++;
          console.error(`[webhook] failed to store message ${msg.id}:`, err);
        }
      }
      for (const status of value.statuses || []) {
        try {
          await handleStatus(business, status);
          result.statuses++;
        } catch (err) {
          result.errors++;
          console.error(`[webhook] failed to apply status ${status.id}:`, err);
        }
      }
    }
  }
  return result;
}
