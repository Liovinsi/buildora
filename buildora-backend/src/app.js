import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import routes from './routes/index.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // Render/Railway sit behind a proxy
  app.disable('x-powered-by');

  app.use(
    cors({
      origin: env.corsOrigins.length ? env.corsOrigins : true,
    })
  );

  // Keep the raw body so the webhook can verify Meta's X-Hub-Signature-256.
  // 5mb allows small base64 logo/product images.
  app.use(
    express.json({
      limit: '5mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  app.get('/', (req, res) => res.json({ name: 'Buildora API', status: 'ok' }));
  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
