// Sends a fake Meta webhook to your local backend so you can test the inbox without WhatsApp.
// Usage: npm run simulate -- <phoneNumberId> "<message>" [fromPhone] [fromName]
// The phoneNumberId must be the one saved on a connected business.
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const [phoneNumberId, text = 'Hi, I am interested in Blue Saree.', from = '919000000001', name = 'Test Customer'] =
  process.argv.slice(2);
if (!phoneNumberId) {
  console.error('Usage: npm run simulate -- <phoneNumberId> "<message>" [fromPhone] [fromName]');
  process.exit(1);
}

const url = `${process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`}/api/webhooks/whatsapp`;
const body = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [{
    id: process.env.META_WABA_ID || '0',
    changes: [{
      field: 'messages',
      value: {
        messaging_product: 'whatsapp',
        metadata: { display_phone_number: '0', phone_number_id: phoneNumberId },
        contacts: [{ profile: { name }, wa_id: from }],
        messages: [{
          from,
          id: `wamid.simulated.${Date.now()}`,
          timestamp: String(Math.floor(Date.now() / 1000)),
          type: 'text',
          text: { body: text },
        }],
      },
    }],
  }],
});

const headers = { 'Content-Type': 'application/json' };
if (process.env.META_APP_SECRET) {
  headers['X-Hub-Signature-256'] =
    'sha256=' + crypto.createHmac('sha256', process.env.META_APP_SECRET).update(body).digest('hex');
}

const res = await fetch(url, { method: 'POST', headers, body });
console.log(res.status, await res.text());
