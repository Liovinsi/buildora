import crypto from 'node:crypto';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

// DEMO customer auth (Phase 1). Customers send their session token in X-Customer-Token.
// This header is ONLY read here: it never grants access to owner/business routes.
export const CUSTOMER_TOKEN_HEADER = 'x-customer-token';

export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

export async function requireCustomer(req, res, next) {
  const token = req.get(CUSTOMER_TOKEN_HEADER);
  if (!token) throw new ApiError(401, 'Please log in to continue.');
  const session = await Session.findOne({ tokenHash: hashToken(token), kind: 'demo-customer', expiresAt: { $gt: new Date() } });
  const user = session && (await User.findById(session.userId));
  if (!user) throw new ApiError(401, 'Your session has expired. Please log in again.');
  req.customer = user;
  req.customerSession = session;
  next();
}
