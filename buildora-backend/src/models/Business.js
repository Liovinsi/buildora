import mongoose from 'mongoose';
import { CATEGORY_IDS } from '../config/categories.js';

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Business name is required'], trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: CATEGORY_IDS, message: 'Unknown category' },
    },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    logo: { type: String, default: '' },
    phone: { type: String, required: [true, 'Phone number is required'], trim: true },
    location: { type: String, trim: true, maxlength: 120, default: '' },
    store: {
      published: { type: Boolean, default: false },
      tagline: { type: String, trim: true, maxlength: 120, default: '' },
      themeColor: { type: String, default: '#4f46e5', match: [/^#[0-9a-fA-F]{6}$/, 'Invalid colour'] },
    },
    // Manual UPI payments (Phase 1: no gateway). Shown to customers at checkout.
    payment: {
      upiId: { type: String, trim: true, maxlength: 100, default: '' },
      payeeName: { type: String, trim: true, maxlength: 80, default: '' },
      qrImage: { type: String, default: '' }, // data URL, same storage as logos/product images
      instructions: { type: String, trim: true, maxlength: 300, default: '' },
    },
    whatsapp: {
      connected: { type: Boolean, default: false },
      // Routing key: Meta sends metadata.phone_number_id with every webhook event.
      phoneNumberId: { type: String, trim: true },
      businessAccountId: { type: String, trim: true },
      displayPhoneNumber: { type: String, default: '' },
      verifiedName: { type: String, default: '' },
      // true when the IDs were checked against the Meta Graph API with the server token at connect time
      verifiedWithMeta: { type: Boolean, default: false },
      connectedAt: Date,
      // 'embedded_signup' = connected through Meta Embedded Signup with this business's own token.
      onboarding: { type: String, enum: ['embedded_signup', 'legacy'], default: 'legacy' },
      // Business integration system user token for this business only, AES-256-GCM encrypted.
      // select:false keeps it out of every query unless explicitly requested (+field).
      accessTokenEncrypted: { type: String, select: false },
      // Two-step verification PIN we set when registering a number. Kept after disconnect so
      // reconnecting the same number can re-register with a matching PIN.
      registeredPhoneNumberId: { type: String },
      registrationPinEncrypted: { type: String, select: false },
      tokenExpiresAt: Date, // null = does not expire
      // Set when Meta rejects the stored token (revoked/expired): the owner must reconnect.
      needsReconnect: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// One WhatsApp number can only feed one Buildora inbox.
businessSchema.index(
  { 'whatsapp.phoneNumberId': 1 },
  { unique: true, partialFilterExpression: { 'whatsapp.phoneNumberId': { $type: 'string' } } }
);

export const Business = mongoose.model('Business', businessSchema);
