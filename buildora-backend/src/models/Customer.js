import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    name: { type: String, trim: true, default: '' },
    phone: { type: String, required: true, trim: true }, // digits only, e.g. 919876543210
    profilePicture: { type: String, default: '' },
    lastMessageAt: { type: Date, index: true },
    lastMessage: { type: String, default: '' },
    unreadCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// A phone number is a customer once per business (multi-tenant).
customerSchema.index({ businessId: 1, phone: 1 }, { unique: true });
customerSchema.index({ businessId: 1, lastMessageAt: -1 });

export const Customer = mongoose.model('Customer', customerSchema);
