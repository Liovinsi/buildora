// Multi-tenant WhatsApp test: Embedded Signup connect, webhooks, inbox, manual reply, isolation.
// Usage: npm run test:whatsapp
//
// Starts a local mock of the Meta Graph API and a separate backend instance (port 5059) on a
// throwaway database, so it never touches real Meta accounts or your Buildora data.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ quiet: true });

const PORT = 5059;
const API = `http://127.0.0.1:${PORT}/api`;
const APP_ID = '1234567890';
const APP_SECRET = 'test-app-secret';
const VERIFY = 'test-verify-token';
const baseUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buildora';
const TEST_DB_URI = baseUri.replace(/\/([^/?]*)(\?|$)/, '/buildora_whatsapp_test$2');

let passed = 0;
let failed = 0;
const check = (name, cond, extra) => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}`, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
};

// ---------------- Mock Meta Graph API ----------------
const TENANTS = {
  A: { code: 'code-A', token: 'tok-A-secret', waba: '1110000000001', phone: '2220000000001', display: '+91 98765 11111', name: 'Uma Fashion' },
  B: { code: 'code-B', token: 'tok-B-secret', waba: '1110000000002', phone: '2220000000002', display: '+91 98765 22222', name: 'Ravi Bakes' },
};
const byToken = (t) => Object.values(TENANTS).find((x) => x.token === t);
const meta = { calls: [], sent: [], registered: {}, subscribed: new Set(), revoked: new Set(), nextId: 1 };

const mock = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = url.pathname.replace(/^\/v[\d.]+\//, '');
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  let body = '';
  for await (const chunk of req) body += chunk;
  body = body ? JSON.parse(body) : {};
  meta.calls.push({ method: req.method, path, token });
  const send = (status, json) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(json)); };
  const err = (status, code, message) => send(status, { error: { code, message, fbtrace_id: 'mock' } });

  if (path === 'oauth/access_token') {
    if (url.searchParams.get('client_id') !== APP_ID || url.searchParams.get('client_secret') !== APP_SECRET) return err(400, 101, 'bad client');
    const t = Object.values(TENANTS).find((x) => x.code === url.searchParams.get('code'));
    return t ? send(200, { access_token: t.token, token_type: 'bearer' }) : err(400, 100, 'This authorization code has expired.');
  }
  if (path === 'debug_token') {
    if (token !== `${APP_ID}|${APP_SECRET}`) return err(400, 190, 'bad app token');
    const t = byToken(url.searchParams.get('input_token'));
    return send(200, { data: t ? { app_id: APP_ID, is_valid: true, expires_at: 0, granular_scopes: [
      { scope: 'whatsapp_business_management', target_ids: [t.waba] },
      { scope: 'whatsapp_business_messaging', target_ids: [t.waba] },
    ] } : { is_valid: false } });
  }
  const owner = byToken(token);
  if (!owner) return err(401, 190, 'Invalid OAuth access token.');
  const [id, edge] = path.split('/');
  const t = Object.values(TENANTS).find((x) => x.waba === id || x.phone === id);
  if (!t || t !== owner) return err(403, 200, 'No permission for this object');

  if (edge === 'phone_numbers') return send(200, { data: [{ id: t.phone, display_phone_number: t.display, verified_name: t.name }] });
  if (edge === 'subscribed_apps') {
    if (req.method === 'POST') meta.subscribed.add(t.waba); else meta.subscribed.delete(t.waba);
    return send(200, { success: true });
  }
  if (edge === 'register') { meta.registered[t.phone] = body.pin; return send(200, { success: true }); }
  if (edge === 'messages') {
    if (meta.revoked.has(token)) return err(401, 190, 'Error validating access token: session invalidated');
    const wamid = `wamid.out.${meta.nextId++}`;
    meta.sent.push({ from: t.phone, token, to: body.to, text: body.text?.body, wamid });
    return send(200, { messaging_product: 'whatsapp', messages: [{ id: wamid }] });
  }
  if (!edge) return send(200, { id: t.phone, display_phone_number: t.display, verified_name: t.name });
  return err(404, 100, 'unknown');
});

// ---------------- Helpers ----------------
async function call(method, path, body) {
  const raw = body === undefined ? undefined : JSON.stringify(body);
  const headers = raw ? { 'Content-Type': 'application/json' } : {};
  if (raw && path.startsWith('/webhooks/')) {
    headers['X-Hub-Signature-256'] = `sha256=${crypto.createHmac('sha256', APP_SECRET).update(raw).digest('hex')}`;
  }
  const res = await fetch(API + path, { method, headers, body: raw });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

const incoming = (tenant, id, text, from) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: tenant.waba, changes: [{ field: 'messages', value: {
    messaging_product: 'whatsapp',
    metadata: { display_phone_number: tenant.display, phone_number_id: tenant.phone },
    contacts: [{ profile: { name: `Customer of ${tenant.name}` }, wa_id: from }],
    messages: [{ from, id, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: text } }],
  } }] }],
});
const statusEvent = (tenant, wamid, status) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: tenant.waba, changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: tenant.phone }, statuses: [{ id: wamid, status, timestamp: '1', recipient_id: '1' }],
  } }] }],
});

const leaksInternals = (obj, tenant) => {
  const s = JSON.stringify(obj);
  return [tenant.waba, tenant.phone, tenant.token, 'accessToken', 'phoneNumberId', 'businessAccountId', 'registrationPin'].some((v) => s.includes(v));
};

// ---------------- Run ----------------
await new Promise((r) => mock.listen(0, '127.0.0.1', r));
const graphUrl = `http://127.0.0.1:${mock.address().port}`;

const server = spawn(process.execPath, ['src/server.js'], {
  env: {
    ...process.env,
    PORT: String(PORT),
    MONGO_URI: TEST_DB_URI,
    META_GRAPH_URL: graphUrl,
    META_APP_ID: APP_ID,
    META_APP_SECRET: APP_SECRET,
    META_ES_CONFIG_ID: '9876543210',
    META_VERIFY_TOKEN: VERIFY,
    META_ACCESS_TOKEN: '',
    TOKEN_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });

await mongoose.connect(TEST_DB_URI);
const db = mongoose.connection;

try {
  for (let i = 0; i < 60; i++) {
    const r = await fetch(`${API}/health`).then((x) => x.json()).catch(() => null);
    if (r?.db === 'connected') break;
    await new Promise((r2) => setTimeout(r2, 250));
  }
  console.log(`Testing ${API} (mock Graph API at ${graphUrl}, db ${TEST_DB_URI})\n`);

  let r = await call('GET', '/health');
  check('backend + MongoDB: health connected', r.status === 200 && r.body.db === 'connected', r.body);

  console.log('\nConfig');
  r = await call('GET', '/whatsapp/config');
  check('config: Embedded Signup available', r.body.data?.available === true && r.body.data.appId === APP_ID && r.body.data.configId === '9876543210', r.body);
  check('config: no secrets / webhook URL / IDs', !JSON.stringify(r.body).match(/secret|token|webhook|phoneNumberId|businessAccountId/i), r.body);

  const mkBiz = async (name, phone) => (await call('POST', '/businesses', { name, category: 'boutique-dress', phone })).body.data;
  const bizA = await mkBiz('Tenant A Fashion', '919876500001');
  const bizB = await mkBiz('Tenant B Bakes', '919876500002');
  const A = TENANTS.A;
  const B = TENANTS.B;

  console.log('\nConnect (Embedded Signup)');
  r = await call('POST', '/whatsapp/connect', { businessId: bizA._id });
  check('connect: missing code -> 400', r.status === 400, r.body);
  r = await call('POST', '/whatsapp/connect', { businessId: bizA._id, code: 'expired-code', event: 'FINISH' });
  check('connect: expired code -> clear 400', r.status === 400 && /expired/i.test(r.body.error), r.body);
  r = await call('POST', '/whatsapp/connect', { businessId: bizB._id, code: B.code, event: 'FINISH', wabaId: A.waba, phoneNumberId: A.phone });
  check('connect: spoofed WABA not granted to token -> 400', r.status === 400, r.body);

  r = await call('POST', '/whatsapp/connect', { businessId: bizA._id, code: A.code, event: 'FINISH', wabaId: A.waba, phoneNumberId: A.phone });
  check('connect A: success', r.status === 200 && r.body.data?.connected === true && r.body.data.displayPhoneNumber === A.display, r.body);
  check('connect A: response hides IDs and token', !leaksInternals(r.body, A), r.body);
  check('connect A: app subscribed to WABA webhooks', meta.subscribed.has(A.waba));
  check('connect A: number registered with 6-digit PIN', /^\d{6}$/.test(meta.registered[A.phone] || ''), meta.registered);
  const pinA = meta.registered[A.phone];

  // No hints from the browser: the server derives WABA + number from the token.
  r = await call('POST', '/whatsapp/connect', { businessId: bizB._id, code: B.code, event: 'FINISH' });
  check('connect B: success using server-verified IDs only', r.status === 200 && r.body.data?.displayPhoneNumber === B.display, r.body);

  const rawA = await db.collection('businesses').findOne({ _id: new mongoose.Types.ObjectId(bizA._id) });
  check('storage: per-business IDs saved internally', rawA.whatsapp.phoneNumberId === A.phone && rawA.whatsapp.businessAccountId === A.waba);
  check('storage: token encrypted at rest (not plaintext)', rawA.whatsapp.accessTokenEncrypted?.startsWith('v1:') && !JSON.stringify(rawA).includes(A.token));

  r = await call('GET', `/businesses/${bizA._id}`);
  check('business API: no WhatsApp internals exposed', r.body.data?.whatsapp?.connected === true && !leaksInternals(r.body, A), r.body.data?.whatsapp);
  r = await call('GET', `/whatsapp/status/${bizA._id}`);
  check('status API: connected + number only', r.body.data?.connected && r.body.data.displayPhoneNumber === A.display && !leaksInternals(r.body, A), r.body);
  r = await call('GET', '/businesses');
  check('business list: no internals', !leaksInternals(r.body, A) && !leaksInternals(r.body, B));

  console.log('\nWebhook');
  r = await call('GET', `/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=987654`);
  check('verify: correct token returns challenge', r.status === 200 && String(r.body) === '987654', r.body);
  r = await call('GET', '/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1');
  check('verify: wrong token -> 403', r.status === 403);
  const unsigned = await fetch(`${API}/webhooks/whatsapp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(incoming(A, 'wamid.x', 'x', '1')) });
  check('signature: unsigned POST rejected (401)', unsigned.status === 401);

  const custA = '919000000001';
  const custB = '919000000002';
  r = await call('POST', '/webhooks/whatsapp', incoming(A, 'wamid.in.A1', 'Is the blue saree available?', custA));
  check('incoming for A stored', r.status === 200 && r.body.messages === 1, r.body);
  r = await call('POST', '/webhooks/whatsapp', incoming(A, 'wamid.in.A1', 'Is the blue saree available?', custA));
  const dupCount = await db.collection('messages').countDocuments({ whatsappMessageId: 'wamid.in.A1' });
  check('incoming duplicate (Meta retry) not stored twice', r.status === 200 && dupCount === 1, { dupCount });
  r = await call('POST', '/webhooks/whatsapp', incoming(B, 'wamid.in.B1', 'Do you have eggless cake?', custB));
  check('incoming for B stored', r.body.messages === 1, r.body);
  // Same customer phone messages both businesses: must become two separate customers.
  r = await call('POST', '/webhooks/whatsapp', incoming(B, 'wamid.in.B2', 'Hello bakery', custA));
  check('same customer phone on B stored separately', r.body.messages === 1, r.body);
  r = await call('POST', '/webhooks/whatsapp', { ...incoming(A, 'wamid.in.X', 'lost', custA), entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '9999999999' }, messages: [{ from: custA, id: 'wamid.in.X', type: 'text', text: { body: 'x' } }] } }] }] });
  check('incoming for unknown number ignored', r.body.skipped === 1, r.body);

  console.log('\nInbox + tenant isolation');
  const listA = (await call('GET', `/customers/business/${bizA._id}`)).body.data;
  const listB = (await call('GET', `/customers/business/${bizB._id}`)).body.data;
  check('A inbox: only A customers', listA.length === 1 && listA[0].phone === custA && listA[0].unreadCount === 1, listA);
  check('B inbox: only B customers', listB.length === 2 && listB.every((c) => c.businessId === bizB._id), listB);
  const cA = listA[0];
  const cB = listB.find((c) => c.phone === custB);

  r = await call('GET', `/messages/customer/${cA._id}?businessId=${bizA._id}`);
  check('A conversation stored in order', r.status === 200 && r.body.data.messages.map((m) => m.message).join('|') === 'Is the blue saree available?', r.body);
  r = await call('GET', `/messages/customer/${cB._id}?businessId=${bizA._id}`);
  check("A cannot read B's conversation (404)", r.status === 404, r.body);
  r = await call('GET', `/messages/customer/${cB._id}`);
  check('conversation without businessId rejected (400)', r.status === 400, r.body);
  r = await call('PUT', `/customers/${cB._id}/read`, { businessId: bizA._id });
  check("A cannot mark B's customer read (404)", r.status === 404, r.body);
  r = await call('PUT', `/customers/${cA._id}/read`, { businessId: bizA._id });
  check('A marks own customer read', r.status === 200 && r.body.data.unreadCount === 0, r.body);
  r = await call('GET', `/messages/business/${bizA._id}`);
  check('A messages endpoint: only A messages', r.body.data.length === 1 && r.body.data.every((m) => m.businessId === bizA._id), r.body);

  console.log('\nManual reply');
  r = await call('POST', '/whatsapp/send', { businessId: bizA._id, customerPhone: custA, message: 'Yes, it is available!' });
  const sentA = meta.sent.at(-1);
  check('A reply accepted (201) and stored as outgoing', r.status === 201 && r.body.data.direction === 'outgoing' && r.body.data.status === 'sent', r.body);
  check("A reply sent from A's number with A's own token", sentA?.from === A.phone && sentA.token === A.token && sentA.to === custA, sentA);
  r = await call('POST', '/whatsapp/send', { businessId: bizB._id, customerPhone: custB, message: 'Yes, eggless available' });
  const sentB = meta.sent.at(-1);
  check("B reply sent from B's number with B's own token", r.status === 201 && sentB.from === B.phone && sentB.token === B.token, sentB);
  r = await call('GET', `/messages/customer/${cA._id}?businessId=${bizA._id}`);
  check('conversation history has incoming + reply', r.body.data.messages.map((m) => m.direction).join(',') === 'incoming,outgoing', r.body);

  await call('POST', '/webhooks/whatsapp', statusEvent(B, sentA.wamid, 'read'));
  let outA = await db.collection('messages').findOne({ whatsappMessageId: sentA.wamid });
  check("B's webhook cannot update A's message status", outA.status === 'sent', outA.status);
  await call('POST', '/webhooks/whatsapp', statusEvent(A, sentA.wamid, 'delivered'));
  outA = await db.collection('messages').findOne({ whatsappMessageId: sentA.wamid });
  check('delivery status applied for A', outA.status === 'delivered', outA.status);

  r = await call('POST', '/whatsapp/send', { businessId: bizA._id, customerPhone: custA, message: '' });
  check('reply: empty message -> 400', r.status === 400, r.body);
  meta.revoked.add(A.token);
  r = await call('POST', '/whatsapp/send', { businessId: bizA._id, customerPhone: custA, message: 'still there?' });
  check('reply with revoked token -> clear error', r.status === 400 && /reconnect/i.test(r.body.error), r.body);
  r = await call('GET', `/whatsapp/status/${bizA._id}`);
  check('status shows needsReconnect after revoked token', r.body.data?.needsReconnect === true, r.body);
  meta.revoked.delete(A.token);

  console.log('\nDisconnect / reconnect');
  r = await call('POST', '/whatsapp/disconnect', { businessId: bizA._id });
  const rawA2 = await db.collection('businesses').findOne({ _id: new mongoose.Types.ObjectId(bizA._id) });
  check('disconnect: status not connected', r.status === 200 && r.body.data.connected === false, r.body);
  check('disconnect: token deleted, number freed', !rawA2.whatsapp.accessTokenEncrypted && !rawA2.whatsapp.phoneNumberId, rawA2.whatsapp);
  check('disconnect: app unsubscribed from WABA', !meta.subscribed.has(A.waba));
  r = await call('POST', '/webhooks/whatsapp', incoming(A, 'wamid.in.A2', 'after disconnect', custA));
  check('disconnect: new messages for A no longer routed', r.body.skipped === 1, r.body);
  r = await call('GET', `/messages/customer/${cA._id}?businessId=${bizA._id}`);
  check('disconnect: conversation history kept', r.body.data?.messages?.length === 2, r.body);

  r = await call('POST', '/whatsapp/connect', { businessId: bizA._id, code: A.code, event: 'FINISH' });
  check('reconnect A: success', r.status === 200 && r.body.data.connected, r.body);
  check('reconnect A: re-registered with the same PIN', meta.registered[A.phone] === pinA, { pinA, now: meta.registered[A.phone] });
  r = await call('POST', '/whatsapp/connect', { businessId: bizB._id, code: A.code, event: 'FINISH' });
  check("B cannot connect A's number while A has it (409)", r.status === 409, r.body);

  check('no server errors logged', !/\[error\]/.test(serverLog), serverLog.split('\n').filter((l) => l.includes('[error]')).slice(0, 3));
} catch (err) {
  failed++;
  console.error('Test crashed:', err);
} finally {
  await db.dropDatabase();
  await mongoose.disconnect();
  server.kill();
  mock.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
