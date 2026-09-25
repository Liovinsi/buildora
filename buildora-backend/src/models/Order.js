import mongoose from 'mongoose';

export const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
export const PAYMENT_STATUSES = ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED'];

// Name/price/image are copied at order time so later product edits never change past orders.
const itemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now },
    by: { type: String, enum: ['customer', 'owner'], required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Tenant keys: every query is scoped by one of these.
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderNumber: { type: Number, required: true }, // per business, starts at 1001
    items: { type: [itemSchema], validate: [(v) => v.length > 0, 'Order has no items'] },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    delivery: {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true, maxlength: 500 }, // house / street
      area: { type: String, trim: true, maxlength: 120, default: '' },
      city: { type: String, trim: true, maxlength: 80, default: '' },
      pincode: { type: String, trim: true, default: '' },
    },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: ORDER_STATUSES, default: 'PLACED' },
    statusHistory: [historySchema],
    payment: {
      // UPI_MANUAL: paid to the shop's own UPI details. UPI_DEMO: development payment block
      // (shop had no UPI details) - no real money involved. Both are verified manually by the owner.
      method: { type: String, enum: ['UPI_MANUAL', 'UPI_DEMO'], default: 'UPI_MANUAL' },
      status: { type: String, enum: PAYMENT_STATUSES, default: 'PENDING' },
      reference: { type: String, trim: true, maxlength: 100, default: '' },
      // Data URL; large, so excluded from list queries.
      screenshot: { type: String, default: '', select: false },
      hasScreenshot: { type: Boolean, default: false },
      submittedAt: Date,
      reviewedAt: Date,
      rejectionReason: { type: String, trim: true, maxlength: 300, default: '' },
    },
  },
  { timestamps: true }
);

orderSchema.index({ businessId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ businessId: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
