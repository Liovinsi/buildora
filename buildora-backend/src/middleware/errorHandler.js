import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

export function notFound(req, res) {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = 500;
  let message = 'Something went wrong';
  let details;

  if (err instanceof ApiError) {
    ({ status, message, details } = err);
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = Object.values(err.errors)[0]?.message || 'Validation failed';
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err?.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists`;
  } else if (mongoose.connection.readyState !== 1 && /Mongo/.test(err?.name)) {
    status = 503;
    message = 'The database is not connected. Please try again shortly.';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    message = 'Request is too large. Try a smaller image.';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
  }

  if (status >= 500) console.error('[error]', err);

  res.status(status).json({ success: false, error: message, ...(details && { details }) });
}
