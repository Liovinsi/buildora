// End-to-end API smoke test. Usage: API_URL=http://localhost:5000 npm run test:api
// Creates throwaway data, simulates a Meta webhook, and checks the inbox. Never calls Meta's send API
// unless a real token is configured AND TEST_SEND_TO is set.
const API = (process.env.API_URL || 'http://localhost:5000') + '/api';
const VERIFY = process.env.META_VERIFY_TOKEN;
let passed = 0;
let failed = 0;

async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

function check(name, cond, extra) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}`, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); }
}

const stamp = Date.now();
const phoneNumberId = `test-${stamp}`;

console.log(`Testing ${API}\n`);

let r = await call('GET', '/health');
check('health: db connected', r.status === 200 && r.body.db === 'connected', r.body);

r = await call('GET', '/categories');
check('categories: 10 returned', r.body.data?.length === 10, r.body);

r = await call('POST', '/businesses', { name: '', category: 'nope', phone: '12' });
check('business: validation error 400', r.status === 400 && r.body.error, r.body);

r = await call('POST', '/businesses', {
  name: 'Uma Fashion', category: 'boutique-dress', phone: '+91 98765 43210',
  description: 'Handpicked sarees', location: 'Chennai',
});
check('business: created 201', r.status === 201 && r.body.data?.slug?.startsWith('uma-fashion'), r.body);
const biz = r.body.data;
check('business: phone normalised', biz?.phone === '919876543210', biz?.phone);

r = await call('GET', `/businesses/${biz._id}`);
check('business: get by id', r.status === 200 && r.body.data._id === biz._id, r.body);

r = await call('GET', '/businesses/not-an-id');
check('business: invalid id 400', r.status === 400, r.body);

r = await call('GET', '/businesses/000000000000000000000000');
check('business: missing 404', r.status === 404, r.body);

r = await call('GET', `/businesses/slug/${biz.slug}`);
check('store: unpublished 404', r.status === 404, r.body);

r = await call('PUT', `/businesses/${biz._id}`, { store: { published: true, tagline: 'Sarees | Kurtis | Kids Wear' } });
check('business: publish store', r.status === 200 && r.body.data.store.published === true, r.body);

r = await call('POST', '/products', { businessId: biz._id, name: 'Blue Saree', price: 1299, category: 'Sarees' });
check('product: created', r.status === 201 && r.body.data.price === 1299, r.body);
const product = r.body.data;

r = await call('POST', '/products', { businessId: biz._id, name: 'Bad', price: -5 });
check('product: negative price 400', r.status === 400, r.body);

r = await call('POST', '/products', { name: 'Orphan', price: 5 });
check('product: missing businessId 400', r.status === 400, r.body);

r = await call('PUT', `/products/${product._id}`, { price: 1199, available: true });
check('product: updated', r.status === 200 && r.body.data.price === 1199, r.body);

r = await call('GET', `/products/business/${biz._id}`);
check('product: list by business', r.body.data?.length === 1, r.body);

r = await call('GET', `/businesses/slug/${biz.slug}`);
check('store: public page with products', r.status === 200 && r.body.data.products.length === 1, r.body);
check('store: no whatsapp ids leaked', r.body.data?.business?.whatsapp === undefined, r.body.data?.business);

// --- Webhook verification ---
if (VERIFY) {
  r = await call('GET', `/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(VERIFY)}&hub.challenge=12345`);
  check('webhook: verify returns challenge', r.status === 200 && String(r.body) === '12345', r.body);
} else {
  console.log('  - skipped webhook verify (set META_VERIFY_TOKEN to test)');
}
r = await call('GET', '/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1');
check('webhook: wrong token 403', r.status === 403, r.body);

// Connecting through the API needs a real Meta token, so mark the business connected directly in Mongo.
const { default: mongoose } = await import('mongoose');
const dotenv = await import('dotenv');
dotenv.config({ quiet: true });
await mongoose.connect(process.env.MONGO_URI);
await mongoose.connection.collection('businesses').updateOne(
  { _id: new mongoose.Types.ObjectId(biz._id) },
  { $set: { whatsapp: { connected: true, phoneNumberId, businessAccountId: '1' } } }
);

const incoming = (id, body, from = '919000000001') => ({
  object: 'whatsapp_business_account',
  entry: [{ id: '1', changes: [{ field: 'messages', value: {
    messaging_product: 'whatsapp',
    metadata: { display_phone_number: '15550000000', phone_number_id: phoneNumberId },
    contacts: [{ profile: { name: 'Priya' }, wa_id: from }],
    messages: [{ from, id, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body } }],
  } }] }],
});

r = await call('POST', '/webhooks/whatsapp', incoming(`wamid.${stamp}.1`, 'Hi, I am interested in Blue Saree.'));
check('webhook: incoming stored', r.status === 200 && r.body.messages === 1, r.body);

r = await call('POST', '/webhooks/whatsapp', incoming(`wamid.${stamp}.1`, 'Hi, I am interested in Blue Saree.'));
check('webhook: duplicate is idempotent', r.status === 200, r.body);

r = await call('POST', '/webhooks/whatsapp', incoming(`wamid.${stamp}.2`, 'Is it available?'));
check('webhook: second message', r.body.messages === 1, r.body);

const other = incoming(`wamid.${stamp}.3`, 'wrong tenant');
other.entry[0].changes[0].value.metadata.phone_number_id = 'unknown-number';
r = await call('POST', '/webhooks/whatsapp', other);
check('webhook: unknown number skipped', r.body.skipped === 1, r.body);

r = await call('GET', `/customers/business/${biz._id}`);
const customer = r.body.data?.[0];
check('customers: created with name', customer?.name === 'Priya' && customer?.phone === '919000000001', r.body);
check('customers: unread = 2 (no dup)', customer?.unreadCount === 2, customer);

r = await call('GET', `/businesses/${biz._id}/stats`);
check('stats: counts', r.body.data?.products === 1 && r.body.data?.customers === 1 && r.body.data?.unreadMessages === 2, r.body);

r = await call('GET', `/messages/customer/${customer._id}?businessId=${biz._id}`);
check('messages: conversation in order', r.body.data?.messages?.map((m) => m.message).join('|') ===
  'Hi, I am interested in Blue Saree.|Is it available?', r.body);

r = await call('GET', `/messages/business/${biz._id}`);
check('messages: by business', r.body.data?.length === 2, r.body);

r = await call('PUT', `/customers/${customer._id}/read`, { businessId: biz._id });
check('customers: mark read', r.body.data?.unreadCount === 0, r.body);

// Status update for a message: simulate an outgoing one first
await mongoose.connection.collection('messages').insertOne({
  businessId: new mongoose.Types.ObjectId(biz._id), customerId: new mongoose.Types.ObjectId(customer._id),
  phone: customer.phone, direction: 'outgoing', message: 'Yes!', whatsappMessageId: `wamid.${stamp}.out`,
  status: 'sent', timestamp: new Date(), createdAt: new Date(),
});
const statusEvent = (status) => ({
  object: 'whatsapp_business_account',
  entry: [{ changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: phoneNumberId },
    statuses: [{ id: `wamid.${stamp}.out`, status, timestamp: '1', recipient_id: customer.phone }],
  } }] }],
});
await call('POST', '/webhooks/whatsapp', statusEvent('read'));
await call('POST', '/webhooks/whatsapp', statusEvent('delivered')); // late, must not downgrade
const out = await mongoose.connection.collection('messages').findOne({ whatsappMessageId: `wamid.${stamp}.out` });
check('status: read not downgraded by late delivered', out?.status === 'read', out?.status);

r = await call('POST', '/whatsapp/send', { businessId: biz._id, customerPhone: customer.phone, message: '' });
check('send: empty message 400', r.status === 400, r.body);

r = await call('GET', '/whatsapp/config');
check('config: no token leaked', r.status === 200 && !JSON.stringify(r.body).includes(process.env.META_ACCESS_TOKEN || '@@none@@'), r.body);

if (process.env.META_ACCESS_TOKEN && process.env.TEST_SEND_TO) {
  // Real send through Meta using the env phone number
  await mongoose.connection.collection('businesses').updateOne(
    { _id: new mongoose.Types.ObjectId(biz._id) },
    { $set: { 'whatsapp.phoneNumberId': process.env.META_PHONE_NUMBER_ID } }
  );
  r = await call('POST', '/whatsapp/send', { businessId: biz._id, customerPhone: process.env.TEST_SEND_TO, message: 'Buildora test message' });
  check('send: real Meta send', r.status === 201, r.body);
} else {
  r = await call('POST', '/whatsapp/send', { businessId: biz._id, customerPhone: customer.phone, message: 'hello' });
  check('send: clear error when no WhatsApp credentials', r.status === 503 && /reconnect/i.test(r.body.error), r.body);
}

r = await call('DELETE', `/products/${product._id}`);
check('product: deleted', r.status === 200, r.body);

// Cleanup test data
const bid = new mongoose.Types.ObjectId(biz._id);
await Promise.all(['products', 'customers', 'messages'].map((c) => mongoose.connection.collection(c).deleteMany({ businessId: bid })));
await mongoose.connection.collection('businesses').deleteOne({ _id: bid });
await mongoose.disconnect();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
