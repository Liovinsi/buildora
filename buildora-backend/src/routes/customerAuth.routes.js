import { Router } from 'express';
import * as c from '../controllers/customerAuth.controller.js';
import { requireCustomer } from '../middleware/customerAuth.js';

// DEMO customer auth (Phase 1). See controllers/customerAuth.controller.js.
const router = Router();

router.post('/register', c.register);
router.post('/login', c.login);
router.post('/logout', requireCustomer, c.logout);
router.get('/me', requireCustomer, c.me);

export default router;
