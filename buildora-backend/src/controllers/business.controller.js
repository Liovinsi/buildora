import { Business } from '../models/Business.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { publicWhatsAppStatus } from './whatsapp.controller.js';
import { getCategory } from '../config/categories.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify } from '../utils/slugify.js';
import { isValidPhone, normalizePhone } from '../utils/phone.js';
import { assertImage, pick } from '../utils/validate.js';

const EDITABLE = ['name', 'category', 'description', 'logo', 'phone', 'location'];

function validateBusinessInput(data, { partial = false } = {}) {
  if (!partial || data.name !== undefined) {
    if (!data.name?.trim()) throw ApiError.badRequest('Business name is required');
  }
  if (!partial || data.category !== undefined) {
    if (!getCategory(data.category)) throw ApiError.badRequest('Please select a valid category');
  }
  if (!partial || data.phone !== undefined) {
    if (!isValidPhone(data.phone)) {
      throw ApiError.badRequest('Enter a valid phone number with country code, e.g. 919876543210');
    }
  }
  assertImage(data.logo, 'Logo');
}

async function uniqueSlug(base, excludeId) {
  const root = slugify(base) || 'store';
  let slug = root;
  for (let i = 2; await Business.exists({ slug, ...(excludeId && { _id: { $ne: excludeId } }) }); i++) {
    slug = `${root}-${i}`;
  }
  return slug;
}

// Admin view. WhatsApp technical values (Meta IDs, tokens) never leave the server.
const toAdmin = (b) => ({ ...b.toObject(), whatsapp: publicWhatsAppStatus(b) });

export const hasPaymentSettings = (b) => Boolean(b.payment?.upiId || b.payment?.qrImage);

// What customers need to pay manually. Only exposed once the owner has configured it.
export const publicPayment = (b) =>
  hasPaymentSettings(b)
    ? { upiId: b.payment.upiId, payeeName: b.payment.payeeName, qrImage: b.payment.qrImage, instructions: b.payment.instructions }
    : null;

// Public view for the storefront - only what customers should see.
const toPublic = (b) => ({
  _id: b._id,
  name: b.name,
  slug: b.slug,
  category: b.category,
  description: b.description,
  logo: b.logo,
  phone: b.phone,
  location: b.location,
  store: b.store,
  payment: publicPayment(b),
  // Any published shop takes orders. Without UPI details, orders start with payment PENDING
  // and the customer pays once the owner adds them.
  acceptingOrders: Boolean(b.store?.published),
});

export async function createBusiness(req, res) {
  const data = pick(req.body, EDITABLE);
  validateBusinessInput(data);
  data.phone = normalizePhone(data.phone);
  data.slug = await uniqueSlug(req.body.slug || data.name);

  const business = await Business.create(data);
  res.status(201).json({ success: true, data: toAdmin(business) });
}

// Demo business picker for V1 (replaced by "my businesses" once auth exists).
export async function listBusinesses(req, res) {
  const businesses = await Business.find({}, 'name slug category logo whatsapp.connected store.published createdAt')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ success: true, data: businesses });
}

export async function getBusiness(req, res) {
  res.json({ success: true, data: toAdmin(req.business) });
}

export async function getBusinessBySlug(req, res) {
  const business = await Business.findOne({ slug: String(req.params.slug).toLowerCase() });
  if (!business) throw ApiError.notFound('Store not found');
  if (!business.store?.published) throw ApiError.notFound('This store is not published yet');

  const products = await Product.find({ businessId: business._id, available: true }).sort({ createdAt: -1 });
  res.json({ success: true, data: { business: toPublic(business), products } });
}

// Lightweight public shop info (no products) for customer page headers.
export async function getBusinessSummaryBySlug(req, res) {
  const business = await Business.findOne({ slug: String(req.params.slug).toLowerCase() });
  if (!business || !business.store?.published) throw ApiError.notFound('Store not found');
  res.json({ success: true, data: toPublic(business) });
}

export async function updateBusiness(req, res) {
  const business = req.business;
  const data = pick(req.body, EDITABLE);
  validateBusinessInput(data, { partial: true });
  if (data.phone !== undefined) data.phone = normalizePhone(data.phone);

  if (req.body.slug !== undefined) {
    const slug = slugify(req.body.slug);
    if (!slug) throw ApiError.badRequest('Store URL is invalid');
    if (await Business.exists({ slug, _id: { $ne: business._id } })) {
      throw ApiError.conflict('This store URL is already taken');
    }
    business.slug = slug;
  }

  if (req.body.store) {
    const store = pick(req.body.store, ['published', 'tagline', 'themeColor']);
    for (const [key, value] of Object.entries(store)) business.set(`store.${key}`, value);
  }

  Object.assign(business, data);
  await business.save();
  res.json({ success: true, data: toAdmin(business) });
}

const UPI_ID_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

// Manual UPI payment settings (owner). Empty values clear a field.
export async function updatePaymentSettings(req, res) {
  const business = req.business;
  const data = pick(req.body, ['upiId', 'payeeName', 'qrImage', 'instructions']);
  for (const key of ['upiId', 'payeeName', 'instructions']) {
    if (data[key] !== undefined) data[key] = String(data[key] ?? '').trim();
  }
  if (data.upiId && !UPI_ID_RE.test(data.upiId)) throw ApiError.badRequest('Enter a valid UPI ID, e.g. yourname@okaxis');
  if (data.payeeName?.length > 80) throw ApiError.badRequest('Payee name is too long');
  if (data.instructions?.length > 300) throw ApiError.badRequest('Instructions are too long (max 300 characters)');
  assertImage(data.qrImage, 'Payment QR');

  for (const [key, value] of Object.entries(data)) business.set(`payment.${key}`, value ?? '');
  await business.save();
  res.json({ success: true, data: toAdmin(business) });
}

export async function getBusinessStats(req, res) {
  const businessId = req.business._id;
  const [products, customers, unread] = await Promise.all([
    Product.countDocuments({ businessId }),
    Customer.countDocuments({ businessId }),
    Customer.aggregate([{ $match: { businessId } }, { $group: { _id: null, total: { $sum: '$unreadCount' } } }]),
  ]);
  res.json({
    success: true,
    data: {
      products,
      customers,
      unreadMessages: unread[0]?.total || 0,
      whatsappConnected: Boolean(req.business.whatsapp?.connected),
      storePublished: Boolean(req.business.store?.published),
    },
  });
}
