import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { isValidSignature, processWebhook } from '../services/webhook.service.js';

// GET - Meta calls this once when you save the callback URL in the dashboard.
export function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!env.meta.verifyToken) {
    console.error('[webhook] verification attempted but META_VERIFY_TOKEN is not set');
    return res.sendStatus(500);
  }
  if (mode === 'subscribe' && token === env.meta.verifyToken) {
    console.log('[webhook] verified by Meta');
    return res.status(200).type('text/plain').send(String(challenge ?? ''));
  }
  console.warn('[webhook] verification failed (wrong verify token or mode)');
  return res.sendStatus(403);
}

// POST - incoming messages and delivery statuses. Never auto-replies.
export async function receiveWebhook(req, res) {
  if (!isValidSignature(req.rawBody, req.get('x-hub-signature-256'))) {
    console.warn('[webhook] rejected: invalid X-Hub-Signature-256');
    return res.sendStatus(401);
  }
  // If the DB is down, let Meta retry later instead of losing the message.
  if (mongoose.connection.readyState !== 1) {
    console.error('[webhook] database unavailable; asking Meta to retry');
    return res.sendStatus(503);
  }

  const result = await processWebhook(req.body);
  res.status(200).json({ received: true, ...result });
}
