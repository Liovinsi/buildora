import { Router } from 'express';
import * as c from '../controllers/whatsapp.controller.js';
import { loadBusiness } from '../middleware/loadBusiness.js';

const router = Router();

router.get('/config', c.getConfig);
router.get('/status/:businessId', loadBusiness(), c.getStatus);
router.post('/connect', loadBusiness(), c.connect);
router.post('/disconnect', loadBusiness(), c.disconnect);
router.post('/send', loadBusiness(), c.send);

export default router;
