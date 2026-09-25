// DEMO customer login (Phase 1): phone number only, no password/OTP. Replace with real auth
// before production. Orders already reference User._id, so they carry over unchanged.
import crypto from 'node:crypto';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { hashToken } from '../middleware/customerAuth.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidPhone, normalizePhone } from '../utils/phone.js';

const SESSION_DAYS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toCustomer = (u) => ({ _id: u._id, name: u.name, phone: u.phone, email: u.email });

async function startSession(user) {
  const token = crypto.randomBytes(32).toString('base64url');
  await Session.create({
    userId: user._id,
    tokenHash: hashToken(token),
    kind: 'demo-customer',
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
  });
  return { demo: true, token, customer: toCustomer(user) };
}

function readPhone(value) {
  const phone = normalizePhone(value);
  if (!isValidPhone(phone)) throw ApiError.badRequest('Enter a valid phone number with country code, e.g. 919876543210');
  return phone;
}

export async function register(req, res) {
  const name = String(req.body.name ?? '').trim();
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const phone = readPhone(req.body.phone);
  if (!name) throw ApiError.badRequest('Name is required');
  if (email && !EMAIL_RE.test(email)) throw ApiError.badRequest('Enter a valid email address');
  if (await User.exists({ phone })) throw ApiError.conflict('This phone number is already registered. Please log in.');

  const user = await User.create({ name, phone, email });
  res.status(201).json({ success: true, data: await startSession(user) });
}

export async function login(req, res) {
  const phone = readPhone(req.body.phone);
  const user = await User.findOne({ phone });
  if (!user) throw ApiError.notFound('No demo account for this phone number. Please register first.');
  res.json({ success: true, data: await startSession(user) });
}

export async function logout(req, res) {
  await Session.deleteOne({ _id: req.customerSession._id });
  res.json({ success: true, data: { loggedOut: true } });
}

export function me(req, res) {
  res.json({ success: true, data: { demo: true, customer: toCustomer(req.customer) } });
}
