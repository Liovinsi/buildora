import { Router } from 'express';
import * as c from '../controllers/customer.controller.js';
import { loadBusiness } from '../middleware/loadBusiness.js';

const router = Router();

router.get('/business/:businessId', loadBusiness(), c.listCustomers);
router.put('/:id/read', loadBusiness((req) => req.query.businessId || req.body?.businessId), c.markCustomerRead);

export default router;
