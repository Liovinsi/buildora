import mongoose from 'mongoose';

export const MESSAGE_STATUSES = ['received', 'sending', 'sent', 'delivered', 'read', 'failed'];

const messageSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    phone: { type: String, required: true },
    direction: { type: String, enum: ['incoming', 'outgoing'], required: true },
    message: { type: String, default: '' },
    type: { type: String, default: 'text' }, // text, image, audio, ... (non-text shown as a label)
    whatsappMessageId: { type: String },
    status: { type: String, enum: MESSAGE_STATUSES, default: 'received' },
    error: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ customerId: 1, timestamp: 1 });
messageSchema.index({ businessId: 1, timestamp: -1 });
// Meta retries webhooks; the unique id makes saving idempotent.
messageSchema.index(
  { whatsappMessageId: 1 },
  { unique: true, partialFilterExpression: { whatsappMessageId: { $type: 'string' } } }
);

export const Message = mongoose.model('Message', messageSchema);
