import mongoose from 'mongoose';
import { ApiError } from './ApiError.js';

export const isObjectId = (id) => mongoose.isValidObjectId(id);

export function assertObjectId(id, label = 'id') {
  if (!isObjectId(id)) throw ApiError.badRequest(`Invalid ${label}`);
}

// Images are stored as small data URLs (resized in the browser) or plain URLs.
const IMAGE_RE = /^(data:image\/(png|jpe?g|webp|gif);base64,|https?:\/\/)/i;
export const MAX_IMAGE_CHARS = 1_500_000; // ~1.1 MB binary

export function assertImage(value, label) {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string' || !IMAGE_RE.test(value)) {
    throw ApiError.badRequest(`${label} must be a PNG/JPEG/WebP/GIF image or an http(s) URL`);
  }
  if (value.length > MAX_IMAGE_CHARS) {
    throw ApiError.badRequest(`${label} is too large (max ~1 MB)`);
  }
}

// Copy only allowed keys from a request body.
export const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));
