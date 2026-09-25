import { Router } from 'express';
import { receiveWebhook, verifyWebhook } from '../controllers/webhook.controller.js';

const router = Router();

router.get('/whatsapp', verifyWebhook);
router.post('/whatsapp', receiveWebhook);

export default router;
