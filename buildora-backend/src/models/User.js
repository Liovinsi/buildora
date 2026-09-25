import mongoose from 'mongoose';

/**
 * A shopper account (orders reference it as customerId). Not the WhatsApp `Customer` contact model.
 * Phase 1 uses DEMO login only (phone, no password/OTP). Real auth later adds credentials here
 * (e.g. passwordHash, verified phone) without changing orders, which already point at this _id.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    phone: { type: String, required: [true, 'Phone number is required'], trim: true, unique: true }, // digits only
    email: { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },
    authProvider: { type: String, enum: ['demo'], default: 'demo' },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
