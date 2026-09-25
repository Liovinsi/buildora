import { Router } from 'express';
import * as c from '../controllers/message.controller.js';
import { loadBusiness } from '../middleware/loadBusiness.js';

const router = Router();

router.get('/business/:businessId', loadBusiness(), c.listBusinessMessages);
router.get('/customer/:customerId', loadBusiness((req) => req.query.businessId), c.listCustomerMessages);

export default router;
