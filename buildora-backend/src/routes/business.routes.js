import { Router } from 'express';
import * as c from '../controllers/business.controller.js';
import { loadBusiness } from '../middleware/loadBusiness.js';

const router = Router();
const byId = loadBusiness((req) => req.params.id);

router.post('/', c.createBusiness);
router.get('/', c.listBusinesses);
router.get('/slug/:slug', c.getBusinessBySlug); // public storefront
router.get('/slug/:slug/summary', c.getBusinessSummaryBySlug); // public, no products
router.get('/:id', byId, c.getBusiness);
router.put('/:id', byId, c.updateBusiness);
router.get('/:id/stats', byId, c.getBusinessStats);
router.put('/:id/payment-settings', byId, c.updatePaymentSettings);

export default router;
