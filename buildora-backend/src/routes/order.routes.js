import { Router } from 'express';
import * as c from '../controllers/order.controller.js';
import { requireCustomer } from '../middleware/customerAuth.js';
import { loadBusiness } from '../middleware/loadBusiness.js';

const router = Router();

// Customer (demo customer session): only ever their own orders.
router.post('/', requireCustomer, c.createOrder);
router.get('/my', requireCustomer, c.listMyOrders);
router.get('/my/:orderId', requireCustomer, c.getMyOrder);
router.post('/my/:orderId/payment', requireCustomer, c.submitMyPayment);

// Business owner: scoped to one business through loadBusiness (the owner check point).
router.get('/business/:businessId', loadBusiness(), c.listBusinessOrders);
router.get('/business/:businessId/:orderId', loadBusiness(), c.getBusinessOrder);
router.patch('/business/:businessId/:orderId/status', loadBusiness(), c.updateOrderStatus);
router.patch('/business/:businessId/:orderId/payment', loadBusiness(), c.reviewPayment);

export default router;
