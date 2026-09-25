import { Router } from 'express';
import * as c from '../controllers/product.controller.js';
import { loadBusiness } from '../middleware/loadBusiness.js';

const router = Router();

router.post('/', loadBusiness(), c.createProduct);
router.get('/business/:businessId', loadBusiness(), c.listProducts);
router.get('/:id', c.getProduct);
router.put('/:id', c.updateProduct);
router.delete('/:id', c.deleteProduct);

export default router;
