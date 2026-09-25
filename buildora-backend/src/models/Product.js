import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: [true, 'Product name is required'], trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
    image: { type: String, default: '' },
    // Alt text / caption for the image. The form defaults it to the product name.
    imageLabel: { type: String, trim: true, maxlength: 120, default: '' },
    category: { type: String, trim: true, maxlength: 60, default: '' },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Product = mongoose.model('Product', productSchema);
