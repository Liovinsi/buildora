import { Business } from '../models/Business.js';
import { ApiError } from '../utils/ApiError.js';
import { assertObjectId } from '../utils/validate.js';

/**
 * Resolves the tenant for a request and attaches it as req.business.
 * V1 has no auth; when auth is added, the ownership check belongs here
 * (e.g. `if (!business.ownerId.equals(req.user.id)) throw 403`).
 */
export const loadBusiness =
  (getId = (req) => req.params.businessId || req.body?.businessId) =>
  async (req, res, next) => {
    const id = getId(req);
    if (!id) throw ApiError.badRequest('businessId is required');
    assertObjectId(id, 'businessId');
    const business = await Business.findById(id);
    if (!business) throw ApiError.notFound('Business not found');
    req.business = business;
    next();
  };
