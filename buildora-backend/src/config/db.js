import mongoose from 'mongoose';
import { env } from './env.js';

// Atlas URIs copied from the dashboard often have no database name ("...mongodb.net/?retryWrites=true").
// Without one, MongoDB silently uses "test", so fall back to "buildora".
function hasDbName(uri) {
  const afterHosts = uri.replace(/^mongodb(\+srv)?:\/\/[^/]*/, '');
  return /^\/[^/?]+/.test(afterHosts);
}

// Turn the most common Atlas connection failures into actionable messages.
function explain(err) {
  const msg = err?.message || String(err);
  if (/bad auth|authentication failed/i.test(msg)) {
    return 'MongoDB rejected the username/password in MONGO_URI. Check the Atlas database user (Database Access) and URL-encode special characters in the password.';
  }
  if (/whitelist|IP.*not.*allowed|Could not connect to any servers/i.test(msg)) {
    return 'Could not reach your Atlas cluster. In Atlas > Network Access, allow your current IP (or 0.0.0.0/0 for testing).';
  }
  if (/querySrv|ENOTFOUND|EAI_AGAIN/i.test(msg)) {
    return 'Could not resolve the Atlas cluster hostname. Check the cluster address in MONGO_URI and your internet/DNS.';
  }
  if (/ECONNREFUSED/i.test(msg)) {
    return `Nothing is listening at the MongoDB address in MONGO_URI (${msg.split('ECONNREFUSED ').pop()}). Start MongoDB or use your Atlas URI.`;
  }
  return msg;
}

export async function connectDB() {
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      ...(!hasDbName(env.mongoUri) && { dbName: 'buildora' }),
    });
  } catch (err) {
    throw new Error(`MongoDB connection failed: ${explain(err)}`);
  }

  const { host, name } = mongoose.connection;
  console.log(`[db] MongoDB connected (${host}/${name})`);

  mongoose.connection.on('disconnected', () => console.warn('[db] MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('[db] MongoDB reconnected'));
  mongoose.connection.on('error', (err) => console.error('[db] MongoDB error:', explain(err)));
}
