import { Business } from '../models/Business.js';
import { nextSequence } from '../models/Counter.js';
import { ORDER_STATUSES, Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidPhone, normalizePhone } from '../utils/phone.js';
import { assertImage, assertObjectId } from '../utils/validate.js';
import { hasPaymentSettings, publicPayment } from './business.controller.js';

const MAX_LINES = 50;
const PINCODE_RE = /^[1-9]\d{5}$/; // Indian PIN code
const MIN_REFERENCE = 4;
const MAX_QTY = 99;
const round2 = (n) => Math.round(n * 100) / 100;

// Forward-only flow; CANCELLED is allowed from any non-final status.
const FLOW = ORDER_STATUSES.filter((s) => s !== 'CANCELLED');
const FINAL = ['DELIVERED', 'CANCELLED'];

const businessSummary = (b) => (b ? { _id: b._id, name: b.name, slug: b.slug, logo: b.logo, phone: b.phone } : null);

// The payment reference is required: an order/payment is never "submitted" without one.
function readPaymentProof(body = {}) {
  const reference = String(body.reference ?? '').trim();
  const screenshot = body.screenshot || '';
  if (reference.length < MIN_REFERENCE) throw ApiError.badRequest('Enter the payment reference (UPI transaction ID) from your UPI app');
  if (reference.length > 100) throw ApiError.badRequest('Payment reference is too long');
  assertImage(screenshot, 'Payment screenshot');
  return { reference, screenshot };
}

// ---------------- Customer (demo auth: req.customer) ----------------

export async function createOrder(req, res) {
  const { businessId, items, delivery = {}, note = '', payment = {} } = req.body || {};
  // Phase 1: no order without the (manual/demo) payment step being completed first.
  if (payment?.status !== 'SUBMITTED') {
    throw ApiError.badRequest('Complete the payment step first: pay, then confirm with your payment reference.');
  }
  const proof = readPaymentProof(payment);
  assertObjectId(businessId, 'businessId');
  const business = await Business.findById(businessId);
  if (!business || !business.store?.published) throw ApiError.notFound('Shop not found');

  if (!Array.isArray(items) || !items.length) throw ApiError.badRequest('Your cart is empty');
  if (items.length > MAX_LINES) throw ApiError.badRequest(`Too many items (max ${MAX_LINES})`);
  const quantities = new Map();
  for (const item of items) {
    assertObjectId(item?.productId, 'product');
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw ApiError.badRequest(`Quantity must be between 1 and ${MAX_QTY}`);
    const id = String(item.productId);
    quantities.set(id, Math.min(MAX_QTY, (quantities.get(id) || 0) + qty));
  }

  // Prices always come from the database, and products must belong to this business.
  const products = await Product.find({ _id: { $in: [...quantities.keys()] }, businessId: business._id, available: true });
  if (products.length !== quantities.size) {
    throw ApiError.badRequest('Some items in your cart are no longer available. Please review your cart.');
  }
  const lines = products.map((p) => {
    const quantity = quantities.get(String(p._id));
    return { productId: p._id, name: p.name, image: p.image, price: p.price, quantity, lineTotal: round2(p.price * quantity) };
  });
  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));

  const name = String(delivery.name ?? '').trim();
  const phone = normalizePhone(delivery.phone);
  const address = String(delivery.address ?? '').trim();
  const area = String(delivery.area ?? '').trim();
  const city = String(delivery.city ?? '').trim();
  const pincode = String(delivery.pincode ?? '').replace(/\s/g, '');
  if (!name) throw ApiError.badRequest('Name is required');
  if (!isValidPhone(phone)) throw ApiError.badRequest('Enter a valid phone number with country code');
  if (address.length < 5 || address.length > 500) throw ApiError.badRequest('Enter your house / street address');
  if (area.length < 2 || area.length > 120) throw ApiError.badRequest('Enter your area / locality');
  if (city.length < 2 || city.length > 80) throw ApiError.badRequest('Enter your city');
  if (!PINCODE_RE.test(pincode)) throw ApiError.badRequest('Enter a valid 6-digit pincode');
  if (String(note).length > 500) throw ApiError.badRequest('Note is too long');

  const now = new Date();

  const order = await Order.create({
    businessId: business._id,
    customerId: req.customer._id,
    orderNumber: await nextSequence(`order:${business._id}`),
    items: lines,
    subtotal,
    total: subtotal,
    delivery: { name, phone, address, area, city, pincode },
    note: String(note).trim(),
    status: 'PLACED',
    statusHistory: [{ status: 'PLACED', at: now, by: 'customer' }],
    // Never VERIFIED here: the owner checks and verifies payments manually.
    payment: {
      method: hasPaymentSettings(business) ? 'UPI_MANUAL' : 'UPI_DEMO',
      status: 'SUBMITTED',
      reference: proof.reference,
      screenshot: proof.screenshot,
      hasScreenshot: Boolean(proof.screenshot),
      submittedAt: now,
    },
  });
  console.log(`[orders] #${order.orderNumber} placed for business ${business.slug}`);
  res.status(201).json({ success: true, data: { ...order.toObject(), business: businessSummary(business) } });
}

export async function listMyOrders(req, res) {
  const orders = await Order.find({ customerId: req.customer._id })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('businessId', 'name slug logo')
    .lean();
  res.json({
    success: true,
    data: orders.map(({ businessId, ...o }) => ({ ...o, businessId: businessId?._id, business: businessSummary(businessId) })),
  });
}

// Another customer's order id is "not found" (never reveal that it exists).
async function findMyOrder(req, { withScreenshot = false } = {}) {
  assertObjectId(req.params.orderId, 'order id');
  const query = Order.findOne({ _id: req.params.orderId, customerId: req.customer._id });
  const order = await (withScreenshot ? query.select('+payment.screenshot') : query);
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

async function customerOrderView(order) {
  const business = await Business.findById(order.businessId);
  return { ...order.toObject(), business: businessSummary(business), businessPayment: business ? publicPayment(business) : null };
}

export async function getMyOrder(req, res) {
  const order = await findMyOrder(req, { withScreenshot: true });
  res.json({ success: true, data: await customerOrderView(order) });
}

// Submit (or resubmit after rejection) the manual UPI payment reference / screenshot.
export async function submitMyPayment(req, res) {
  const order = await findMyOrder(req, { withScreenshot: true });
  if (order.status === 'CANCELLED') throw ApiError.badRequest('This order was cancelled.');
  if (!['PENDING', 'REJECTED'].includes(order.payment.status)) {
    throw ApiError.badRequest('Payment details were already submitted for this order.');
  }
  const business = await Business.findById(order.businessId);
  if (order.payment.method !== 'UPI_DEMO' && (!business || !hasPaymentSettings(business))) {
    throw ApiError.badRequest('The shop has not added its UPI payment details yet. Please try again later.');
  }
  const proof = readPaymentProof(req.body);

  order.payment.status = 'SUBMITTED';
  order.payment.reference = proof.reference;
  order.payment.screenshot = proof.screenshot;
  order.payment.hasScreenshot = Boolean(proof.screenshot);
  order.payment.submittedAt = new Date();
  order.payment.rejectionReason = '';
  await order.save();
  res.json({ success: true, data: await customerOrderView(order) });
}

// ---------------- Owner (req.business from loadBusiness) ----------------

export async function listBusinessOrders(req, res) {
  const filter = { businessId: req.business._id };
  if (req.query.status) {
    if (!ORDER_STATUSES.includes(req.query.status)) throw ApiError.badRequest('Invalid status filter');
    filter.status = req.query.status;
  }
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200).populate('customerId', 'name phone').lean();
  res.json({ success: true, data: orders.map(({ customerId, ...o }) => ({ ...o, customerId: customerId?._id, customer: customerId })) });
}

// An order of another business is "not found".
async function findBusinessOrder(req, { withScreenshot = false } = {}) {
  assertObjectId(req.params.orderId, 'order id');
  const query = Order.findOne({ _id: req.params.orderId, businessId: req.business._id });
  const order = await (withScreenshot ? query.select('+payment.screenshot') : query);
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

async function ownerOrderView(order) {
  await order.populate('customerId', 'name phone email');
  const { customerId, ...o } = order.toObject();
  return { ...o, customerId: customerId?._id, customer: customerId };
}

export async function getBusinessOrder(req, res) {
  const order = await findBusinessOrder(req, { withScreenshot: true });
  res.json({ success: true, data: await ownerOrderView(order) });
}

export async function updateOrderStatus(req, res) {
  const order = await findBusinessOrder(req, { withScreenshot: true });
  const next = String(req.body.status || '');
  const note = String(req.body.note ?? '').trim();
  if (!ORDER_STATUSES.includes(next)) throw ApiError.badRequest('Invalid status');
  if (note.length > 300) throw ApiError.badRequest('Note is too long');
  if (FINAL.includes(order.status)) throw ApiError.badRequest(`This order is already ${order.status.toLowerCase()}.`);
  if (next !== 'CANCELLED' && FLOW.indexOf(next) <= FLOW.indexOf(order.status)) {
    throw ApiError.badRequest('Order status can only move forward.');
  }

  order.status = next;
  order.statusHistory.push({ status: next, note, at: new Date(), by: 'owner' });
  await order.save();
  res.json({ success: true, data: await ownerOrderView(order) });
}

// Manual verification: the owner checks their UPI app and marks the payment verified/rejected.
export async function reviewPayment(req, res) {
  const order = await findBusinessOrder(req, { withScreenshot: true });
  const status = String(req.body.status || '');
  const reason = String(req.body.reason ?? '').trim();
  if (!['VERIFIED', 'REJECTED'].includes(status)) throw ApiError.badRequest('Payment status must be VERIFIED or REJECTED');
  if (order.payment.status === 'PENDING') throw ApiError.badRequest('The customer has not submitted payment details yet.');
  if (reason.length > 300) throw ApiError.badRequest('Reason is too long');

  order.payment.status = status;
  order.payment.reviewedAt = new Date();
  order.payment.rejectionReason = status === 'REJECTED' ? reason : '';
  await order.save();
  res.json({ success: true, data: await ownerOrderView(order) });
}
