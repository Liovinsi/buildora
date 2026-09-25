import { Customer } from '../models/Customer.js';
import { Message } from '../models/Message.js';
import { ApiError } from '../utils/ApiError.js';
import { assertObjectId } from '../utils/validate.js';

const clampLimit = (value, def, max) => Math.min(Math.max(Number(value) || def, 1), max);

export async function listBusinessMessages(req, res) {
  const limit = clampLimit(req.query.limit, 100, 500);
  const messages = await Message.find({ businessId: req.business._id }).sort({ timestamp: -1 }).limit(limit);
  res.json({ success: true, data: messages });
}

// Returns the latest `limit` messages in chronological order. Pass ?before=<ISO date> for older pages.
// Scoped to the business: a customer id from another business is "not found".
export async function listCustomerMessages(req, res) {
  assertObjectId(req.params.customerId, 'customer id');
  const customer = await Customer.findOne({ _id: req.params.customerId, businessId: req.business._id });
  if (!customer) throw ApiError.notFound('Customer not found');

  const filter = { customerId: customer._id, businessId: customer.businessId };
  if (req.query.before) {
    const before = new Date(req.query.before);
    if (Number.isNaN(before.getTime())) throw ApiError.badRequest('Invalid "before" date');
    filter.timestamp = { $lt: before };
  }
  const limit = clampLimit(req.query.limit, 200, 500);
  const messages = await Message.find(filter).sort({ timestamp: -1 }).limit(limit);
  res.json({ success: true, data: { customer, messages: messages.reverse() } });
}
