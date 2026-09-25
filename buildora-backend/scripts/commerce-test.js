// Commerce Phase 1 test: demo customer login, payment settings, orders, statuses, isolation.
// Usage: npm run test:commerce
// Runs a separate backend instance (port 5058) on a throwaway database; your data is untouched.
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ quiet: true });

const PORT = 5058;
const API = `http://127.0.0.1:${PORT}/api`;
const baseUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buildora';
const TEST_DB_URI = baseUri.replace(/\/([^/?]*)(\?|$)/, '/buildora_commerce_test$2');
const QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let passed = 0;
let failed = 0;
const check = (name, cond, extra) => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}`, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
};

async function call(method, path, body, token) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['X-Customer-Token'] = token;
  const res = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

const server = spawn(process.execPath, ['src/server.js'], {
  env: { ...process.env, PORT: String(PORT), MONGO_URI: TEST_DB_URI },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });
await mongoose.connect(TEST_DB_URI);

try {
  for (let i = 0; i < 60; i++) {
    const r = await fetch(`${API}/health`).then((x) => x.json()).catch(() => null);
    if (r?.db === 'connected') break;
    await new Promise((r2) => setTimeout(r2, 250));
  }
  console.log(`Testing ${API} (db ${TEST_DB_URI})\n`);

  // Two businesses with products
  const mk = async (name, phone) => (await call('POST', '/businesses', { name, category: 'boutique-dress', phone })).body.data;
  const bizA = await mk('Shop A Fashion', '919800000001');
  const bizB = await mk('Shop B Bakes', '919800000002');
  const product = async (biz, name, price, extra = {}) => (await call('POST', '/products', { businessId: biz._id, name, price, ...extra })).body.data;
  const saree = await product(bizA, 'Blue Silk Saree', 1299.5);
  const kurti = await product(bizA, 'Cotton Kurti', 499);
  const hidden = await product(bizA, 'Hidden Item', 10, { available: false });
  const cake = await product(bizB, 'Chocolate Cake', 650);

  console.log('Payment settings + shop');
  let r = await call('GET', `/businesses/slug/${bizA.slug}`);
  check('unpublished shop not public', r.status === 404);
  await call('PUT', `/businesses/${bizA._id}`, { store: { published: true } });
  await call('PUT', `/businesses/${bizB._id}`, { store: { published: true } });
  r = await call('GET', `/businesses/slug/${bizA.slug}`);
  check('published shop without payment: accepts orders, payment null', r.body.data.business.acceptingOrders === true && r.body.data.business.payment === null, r.body.data.business);
  r = await call('PUT', `/businesses/${bizA._id}/payment-settings`, { upiId: 'not a upi' });
  check('invalid UPI ID rejected', r.status === 400, r.body);
  r = await call('PUT', `/businesses/${bizA._id}/payment-settings`, { upiId: 'shopa@okaxis', payeeName: 'Shop A', qrImage: QR, instructions: 'Add order name in note' });
  check('payment settings saved', r.status === 200 && r.body.data.payment.upiId === 'shopa@okaxis', r.body);
  r = await call('GET', `/businesses/slug/${bizA.slug}`);
  check('public shop shows UPI + QR and accepts orders', r.body.data.business.acceptingOrders && r.body.data.business.payment.qrImage === QR);
  check('public shop still hides WhatsApp internals', r.body.data.business.whatsapp === undefined);
  await call('PUT', `/businesses/${bizB._id}/payment-settings`, { upiId: 'shopb@okicici' });

  console.log('\nDemo customer auth');
  r = await call('POST', '/customer-auth/login', { phone: '919111111111' });
  check('login before register -> 404 with hint', r.status === 404 && /register/i.test(r.body.error), r.body);
  r = await call('POST', '/customer-auth/register', { name: 'Priya', phone: '+91 91111 11111', email: 'priya@example.com' });
  check('register -> token + demo flag', r.status === 201 && r.body.data.demo === true && r.body.data.token && r.body.data.customer.phone === '919111111111', r.body);
  const priya = r.body.data;
  r = await call('POST', '/customer-auth/register', { name: 'Dup', phone: '919111111111' });
  check('duplicate phone -> 409', r.status === 409);
  r = await call('POST', '/customer-auth/login', { phone: '919111111111' });
  check('login -> new token', r.status === 200 && r.body.data.token !== priya.token);
  const priyaToken2 = r.body.data.token;
  r = await call('GET', '/customer-auth/me', undefined, priya.token);
  check('me with token', r.status === 200 && r.body.data.customer.name === 'Priya');
  r = await call('GET', '/customer-auth/me');
  check('me without token -> 401', r.status === 401);
  r = await call('GET', '/customer-auth/me', undefined, 'forged-token');
  check('forged token -> 401', r.status === 401);
  const rawSession = await mongoose.connection.collection('sessions').findOne({});
  check('session token stored only as hash', rawSession.tokenHash && !JSON.stringify(rawSession).includes(priya.token));
  const ravi = (await call('POST', '/customer-auth/register', { name: 'Ravi', phone: '919222222222' })).body.data;

  console.log('\nPlace order');
  const orderBody = (overrides = {}) => ({
    businessId: bizA._id,
    items: [{ productId: saree._id, quantity: 2 }, { productId: kurti._id, quantity: 1 }],
    delivery: { name: 'Priya S', phone: '9111111111', address: '12 Lake Road', area: 'T Nagar', city: 'Chennai', pincode: '600017' },
    payment: { status: 'SUBMITTED', reference: 'UPI123456789' },
    ...overrides,
  });
  r = await call('POST', '/orders', orderBody());
  check('order without login -> 401', r.status === 401);
  r = await call('POST', '/orders', orderBody({ items: [{ productId: saree._id, quantity: 1, price: 1 }], total: 1 }), priya.token);
  check('client-sent price ignored (server price used)', r.status === 201 && r.body.data.total === 1299.5, r.body);
  const o1 = r.body.data;
  check('order #1001 with businessId + customerId', o1.orderNumber === 1001 && o1.businessId === bizA._id && o1.customerId === priya.customer._id, o1);
  r = await call('POST', '/orders', orderBody(), priya.token);
  const o2 = r.body.data;
  check('multi-item totals: 2×1299.5 + 499 = 3098', r.status === 201 && o2.subtotal === 3098 && o2.total === 3098 && o2.items.length === 2, o2);
  check('structured address saved', o2.delivery.area === 'T Nagar' && o2.delivery.city === 'Chennai' && o2.delivery.pincode === '600017' && o2.delivery.phone === '9111111111', o2.delivery);
  check('order number increments per business', o2.orderNumber === 1002);
  check('status PLACED + timeline entry', o2.status === 'PLACED' && o2.statusHistory.length === 1 && o2.statusHistory[0].by === 'customer');
  check('payment SUBMITTED with reference', o2.payment.status === 'SUBMITTED' && o2.payment.reference === 'UPI123456789');
  r = await call('POST', '/orders', orderBody({ items: [{ productId: cake._id, quantity: 1 }] }), priya.token);
  check("other business's product rejected", r.status === 400, r.body);
  r = await call('POST', '/orders', orderBody({ items: [{ productId: hidden._id, quantity: 1 }] }), priya.token);
  check('unavailable product rejected', r.status === 400, r.body);
  r = await call('POST', '/orders', orderBody({ items: [{ productId: saree._id, quantity: 0 }] }), priya.token);
  check('invalid quantity rejected', r.status === 400);
  r = await call('POST', '/orders', orderBody({ items: [] }), priya.token);
  check('empty cart rejected', r.status === 400);
  r = await call('POST', '/orders', orderBody({ delivery: { name: 'X', phone: '12', address: '' } }), priya.token);
  check('invalid delivery details rejected', r.status === 400);
  const addr = { name: 'Priya S', phone: '9111111111', address: '12 Lake Road', area: 'T Nagar', city: 'Chennai' };
  r = await call('POST', '/orders', orderBody({ delivery: { ...addr, pincode: '12345' } }), priya.token);
  check('invalid pincode rejected', r.status === 400 && /pincode/i.test(r.body.error), r.body);
  r = await call('POST', '/orders', orderBody({ delivery: { ...addr, city: '', pincode: '600017' } }), priya.token);
  check('missing city rejected', r.status === 400 && /city/i.test(r.body.error), r.body);
  r = await call('POST', '/orders', orderBody({ delivery: { ...addr, area: '', pincode: '600017' } }), priya.token);
  check('missing area rejected', r.status === 400 && /area/i.test(r.body.error), r.body);
  console.log('\nPayment required before order');
  const ordersBefore = await mongoose.connection.collection('orders').countDocuments();
  r = await call('POST', '/orders', orderBody({ payment: undefined }), priya.token);
  check('no payment at all -> 400', r.status === 400 && /payment step/i.test(r.body.error), r.body);
  r = await call('POST', '/orders', orderBody({ payment: { status: 'PENDING', reference: 'UPI123456789' } }), priya.token);
  check('payment status PENDING -> 400', r.status === 400, r.body);
  r = await call('POST', '/orders', orderBody({ payment: { status: 'VERIFIED', reference: 'UPI123456789' } }), priya.token);
  check('client cannot claim VERIFIED -> 400', r.status === 400, r.body);
  r = await call('POST', '/orders', orderBody({ payment: { status: 'SUBMITTED', reference: '' } }), priya.token);
  check('SUBMITTED without reference -> 400', r.status === 400 && /reference/i.test(r.body.error), r.body);
  r = await call('POST', '/orders', orderBody({ payment: { status: 'SUBMITTED', reference: 'ab' } }), priya.token);
  check('too-short reference -> 400', r.status === 400, r.body);
  r = await call('POST', '/orders', orderBody({ payment: { status: 'SUBMITTED', screenshot: QR } }), priya.token);
  check('screenshot without reference -> 400', r.status === 400, r.body);
  check('no order created by rejected requests', (await mongoose.connection.collection('orders').countDocuments()) === ordersBefore);
  r = await call('POST', '/orders', orderBody({ payment: { status: 'SUBMITTED', reference: 'UPI55555', screenshot: QR } }), priya.token);
  check('reference + screenshot accepted: SUBMITTED, manual UPI, never auto-verified', r.status === 201 && r.body.data.payment.status === 'SUBMITTED' && r.body.data.payment.hasScreenshot && r.body.data.payment.method === 'UPI_MANUAL' && r.body.data.status === 'PLACED');
  // A legacy unpaid order (created before this rule) for the owner-side checks below.
  const pendingOrder = { _id: new mongoose.Types.ObjectId() };
  await mongoose.connection.collection('orders').insertOne({
    _id: pendingOrder._id, businessId: new mongoose.Types.ObjectId(bizA._id), customerId: new mongoose.Types.ObjectId(priya.customer._id),
    orderNumber: 999, items: [{ productId: new mongoose.Types.ObjectId(saree._id), name: 'Blue Silk Saree', price: 1, quantity: 1, lineTotal: 1 }],
    subtotal: 1, total: 1, delivery: { name: 'x', phone: '911111111111', address: 'legacy' }, status: 'PLACED',
    statusHistory: [{ status: 'PLACED', at: new Date(), by: 'customer' }], payment: { method: 'UPI_MANUAL', status: 'PENDING' }, createdAt: new Date(),
  });
  r = await call('POST', '/orders', { ...orderBody(), businessId: bizB._id, items: [{ productId: cake._id, quantity: 1 }] }, ravi.token);
  check('Ravi orders from shop B (#1001 for B)', r.status === 201 && r.body.data.orderNumber === 1001);
  const raviOrder = r.body.data;
  const bizC = await mk('Shop C No Payment', '919800000003');
  await call('PUT', `/businesses/${bizC._id}`, { store: { published: true } });
  const cItem = await product(bizC, 'Thing', 5);
  r = await call('POST', '/orders', { ...orderBody(), businessId: bizC._id, items: [{ productId: cItem._id, quantity: 1 }] }, priya.token);
  check('shop without UPI details: demo payment order is SUBMITTED + labelled UPI_DEMO', r.status === 201 && r.body.data.payment.status === 'SUBMITTED' && r.body.data.payment.method === 'UPI_DEMO' && r.body.data.payment.reference === 'UPI123456789', r.body);
  const cOrder = r.body.data;
  r = await call('POST', '/orders', { ...orderBody({ payment: {} }), businessId: bizC._id, items: [{ productId: cItem._id, quantity: 1 }] }, priya.token);
  check('shop without UPI details still requires the payment step', r.status === 400);
  r = await call('GET', `/orders/my/${cOrder._id}`, undefined, priya.token);
  check('order detail reports shop payment not configured', r.status === 200 && r.body.data.businessPayment === null);
  await call('PATCH', `/orders/business/${bizC._id}/${cOrder._id}/payment`, { status: 'REJECTED', reason: 'Demo check' });
  r = await call('POST', `/orders/my/${cOrder._id}/payment`, { reference: 'DEMO-2' }, priya.token);
  check('rejected demo payment can be resubmitted', r.status === 200 && r.body.data.payment.status === 'SUBMITTED' && r.body.data.payment.reference === 'DEMO-2', r.body);
  const unpub = await mk('Shop D Unpublished', '919800000004');
  const dItem = await product(unpub, 'Hidden', 5);
  r = await call('POST', '/orders', { ...orderBody(), businessId: unpub._id, items: [{ productId: dItem._id, quantity: 1 }] }, priya.token);
  check('unpublished shop cannot take orders', r.status === 404, r.body);

  console.log('\nCustomer isolation');
  r = await call('GET', '/orders/my', undefined, priyaToken2);
  check('Priya sees only her 5 orders (any session)', r.status === 200 && r.body.data.length === 5 && r.body.data.every((o) => o.customerId === priya.customer._id), r.body.data?.length);
  check('my orders include shop name', r.body.data.every((o) => o.business?.name) && r.body.data.some((o) => o.business.name === 'Shop A Fashion'));
  check('list excludes screenshots', !JSON.stringify(r.body).includes(QR.slice(30)));
  r = await call('GET', '/orders/my', undefined, ravi.token);
  check('Ravi sees only his order', r.body.data.length === 1 && r.body.data[0]._id === raviOrder._id);
  r = await call('GET', `/orders/my/${o2._id}`, undefined, ravi.token);
  check("Ravi cannot open Priya's order (404)", r.status === 404);
  r = await call('GET', `/orders/my/${o2._id}`, undefined, priya.token);
  check('Priya opens her order with shop payment details', r.status === 200 && r.body.data.businessPayment?.upiId === 'shopa@okaxis');
  r = await call('GET', `/orders/my/${o2._id}`);
  check('order detail without login -> 401', r.status === 401);

  console.log('\nOwner isolation');
  r = await call('GET', `/orders/business/${bizA._id}`);
  check('Shop A sees only its orders', r.body.data.length === 4 && r.body.data.every((o) => o.businessId === bizA._id), r.body.data?.length);
  check('owner list shows customer name/phone', r.body.data[0].customer?.name === 'Priya');
  r = await call('GET', `/orders/business/${bizB._id}`);
  check('Shop B sees only its order', r.body.data.length === 1 && r.body.data[0]._id === raviOrder._id);
  r = await call('GET', `/orders/business/${bizB._id}/${o2._id}`);
  check("Shop B cannot open Shop A's order (404)", r.status === 404);
  r = await call('PATCH', `/orders/business/${bizB._id}/${o2._id}/status`, { status: 'CONFIRMED' });
  check("Shop B cannot update Shop A's order (404)", r.status === 404);
  r = await call('GET', `/orders/business/${bizA._id}`, undefined, priya.token);
  check('customer token does not change owner scoping', r.body.data.every((o) => o.businessId === bizA._id));
  r = await call('GET', '/orders/business/not-an-id');
  check('invalid business id -> 400', r.status === 400);

  console.log('\nStatus + payment workflow');
  r = await call('PATCH', `/orders/business/${bizA._id}/${o2._id}/payment`, { status: 'REJECTED', reason: 'Reference not found' });
  check('owner rejects payment', r.body.data.payment.status === 'REJECTED' && r.body.data.payment.rejectionReason === 'Reference not found', r.body);
  r = await call('POST', `/orders/my/${o2._id}/payment`, { reference: '' }, priya.token);
  check('resubmit needs a reference', r.status === 400);
  r = await call('POST', `/orders/my/${o2._id}/payment`, { reference: 'UPI999' }, ravi.token);
  check("Ravi cannot submit payment for Priya's order", r.status === 404);
  r = await call('POST', `/orders/my/${o2._id}/payment`, { reference: 'UPI999' }, priya.token);
  check('customer resubmits after rejection', r.body.data?.payment.status === 'SUBMITTED' && r.body.data.payment.reference === 'UPI999' && !r.body.data.payment.rejectionReason, r.body);
  r = await call('POST', `/orders/my/${o2._id}/payment`, { reference: 'UPI000' }, priya.token);
  check('cannot resubmit while SUBMITTED', r.status === 400);
  r = await call('PATCH', `/orders/business/${bizA._id}/${o2._id}/payment`, { status: 'VERIFIED' });
  check('owner verifies payment', r.body.data.payment.status === 'VERIFIED');
  r = await call('PATCH', `/orders/business/${bizA._id}/${pendingOrder._id}/payment`, { status: 'VERIFIED' });
  check('cannot verify when nothing submitted', r.status === 400);

  for (const s of ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']) {
    r = await call('PATCH', `/orders/business/${bizA._id}/${o2._id}/status`, { status: s, note: s === 'OUT_FOR_DELIVERY' ? 'With courier' : '' });
  }
  check('status moved forward to OUT_FOR_DELIVERY', r.body.data.status === 'OUT_FOR_DELIVERY', r.body);
  r = await call('PATCH', `/orders/business/${bizA._id}/${o2._id}/status`, { status: 'PREPARING' });
  check('cannot move status backwards', r.status === 400);
  r = await call('PATCH', `/orders/business/${bizA._id}/${o2._id}/status`, { status: 'DELIVERED' });
  check('delivered', r.body.data.status === 'DELIVERED');
  r = await call('PATCH', `/orders/business/${bizA._id}/${o2._id}/status`, { status: 'CANCELLED' });
  check('cannot change a delivered order', r.status === 400);
  r = await call('PATCH', `/orders/business/${bizA._id}/${o1._id}/status`, { status: 'CANCELLED', note: 'Out of stock' });
  check('owner cancels an order', r.body.data.status === 'CANCELLED');
  r = await call('PATCH', `/orders/business/${bizA._id}/${o1._id}/status`, { status: 'BOGUS' });
  check('invalid status rejected', r.status === 400);

  r = await call('GET', `/orders/my/${o2._id}`, undefined, priya.token);
  const timeline = r.body.data.statusHistory.map((h) => h.status).join('>');
  check('customer sees updated status + full timeline', r.body.data.status === 'DELIVERED' && timeline === 'PLACED>CONFIRMED>PREPARING>READY>OUT_FOR_DELIVERY>DELIVERED', timeline);
  check('timeline keeps owner notes', r.body.data.statusHistory.find((h) => h.status === 'OUT_FOR_DELIVERY')?.note === 'With courier');

  await call('PUT', `/products/${saree._id}`, { price: 1500, name: 'Renamed Saree' });
  r = await call('GET', `/orders/my/${o2._id}`, undefined, priya.token);
  check('past order keeps original name/price after product edit', r.body.data.items[0].name === 'Blue Silk Saree' && r.body.data.items[0].price === 1299.5);

  r = await call('POST', '/customer-auth/logout', {}, priya.token);
  r = await call('GET', '/orders/my', undefined, priya.token);
  check('logout revokes that session', r.status === 401);

  const raw = await mongoose.connection.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(o2._id) });
  check('order stored in MongoDB with ObjectId businessId + customerId', raw.businessId instanceof mongoose.Types.ObjectId && raw.customerId instanceof mongoose.Types.ObjectId);
  check('no server errors logged', !/\[error\]/.test(serverLog), serverLog.split('\n').filter((l) => l.includes('[error]')).slice(0, 3));
} catch (err) {
  failed++;
  console.error('Test crashed:', err);
} finally {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.kill();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
