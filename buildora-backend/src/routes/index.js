import { Router } from 'express';
import mongoose from 'mongoose';
import businessRoutes from './business.routes.js';
import categoryRoutes from './category.routes.js';
import customerAuthRoutes from './customerAuth.routes.js';
import customerRoutes from './customer.routes.js';
import messageRoutes from './message.routes.js';
import orderRoutes from './order.routes.js';
import productRoutes from './product.routes.js';
import webhookRoutes from './webhook.routes.js';
import whatsappRoutes from './whatsapp.routes.js';

const router = Router();

router.get('/', (req, res) => res.json({ success: true, name: 'Buildora API', status: 'ok' }));

router.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    message: dbConnected ? 'Buildora API is running' : 'Buildora API is running but the database is not connected',
    db: dbConnected ? 'connected' : 'disconnected',
  });
});

router.use('/categories', categoryRoutes);
router.use('/businesses', businessRoutes);
router.use('/products', productRoutes);
router.use('/customers', customerRoutes);
router.use('/messages', messageRoutes);
router.use('/customer-auth', customerAuthRoutes);
router.use('/orders', orderRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
