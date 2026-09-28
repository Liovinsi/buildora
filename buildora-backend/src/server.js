import { connectDB } from './config/db.js';
import { env, validateEnv } from './config/env.js';
import { createApp } from './app.js';

const DB_RETRY_MS = 5000;

// Keep retrying in the background so the API stays up while MongoDB is down.
// Routes that need the database answer 503 until it connects.
async function connectWithRetry() {
  for (;;) {
    try {
      await connectDB();
      return;
    } catch (err) {
      console.error(`[db] ${err.message} Retrying in ${DB_RETRY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, DB_RETRY_MS));
    }
  }
}

async function start() {
  validateEnv();

  const app = createApp();
  // Express 5 passes listen errors (e.g. EADDRINUSE) to this callback instead of throwing.
  const server = app.listen(env.port, (err) => {
    if (err) {
      console.error(`[server] could not listen on port ${env.port}: ${err.message}`);
      process.exit(1);
    }
    console.log(`[server] Buildora API listening on http://localhost:${env.port}`);
    console.log('[server] WhatsApp webhook path: /api/webhooks/whatsapp');
  });
  connectWithRetry();

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});
