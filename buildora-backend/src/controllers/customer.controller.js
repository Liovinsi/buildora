import { Customer } from '../models/Customer.js';
import { ApiError } from '../utils/ApiError.js';
import { assertObjectId } from '../utils/validate.js';

export async function listCustomers(req, res) {
  const customers = await Customer.find({ businessId: req.business._id })
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .limit(500);
  res.json({ success: true, data: customers });
}

// Scoped to the business: a customer id from another business is "not found".
export async function markCustomerRead(req, res) {
  assertObjectId(req.params.id, 'customer id');
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, businessId: req.business._id },
    { $set: { unreadCount: 0 } },
    { returnDocument: 'after' }
  );
  if (!customer) throw ApiError.notFound('Customer not found');
  res.json({ success: true, data: customer });
}
