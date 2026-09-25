import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { assertImage, assertObjectId, pick } from '../utils/validate.js';

const EDITABLE = ['name', 'description', 'price', 'image', 'imageLabel', 'category', 'available'];

function validateProductInput(data, { partial = false } = {}) {
  if (!partial || data.name !== undefined) {
    if (!String(data.name || '').trim()) throw ApiError.badRequest('Product name is required');
  }
  if (!partial || data.price !== undefined) {
    const price = Number(data.price);
    if (data.price === '' || data.price === null || !Number.isFinite(price) || price < 0) {
      throw ApiError.badRequest('Enter a valid price (0 or more)');
    }
    data.price = Math.round(price * 100) / 100;
  }
  if (data.available !== undefined) data.available = Boolean(data.available);
  assertImage(data.image, 'Product image');
}

async function findProduct(id) {
  assertObjectId(id, 'product id');
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

export async function createProduct(req, res) {
  const data = pick(req.body, EDITABLE);
  validateProductInput(data);
  const product = await Product.create({ ...data, businessId: req.business._id });
  res.status(201).json({ success: true, data: product });
}

export async function listProducts(req, res) {
  const products = await Product.find({ businessId: req.business._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: products });
}

export async function getProduct(req, res) {
  res.json({ success: true, data: await findProduct(req.params.id) });
}

export async function updateProduct(req, res) {
  const product = await findProduct(req.params.id);
  const data = pick(req.body, EDITABLE);
  validateProductInput(data, { partial: true });
  Object.assign(product, data);
  await product.save();
  res.json({ success: true, data: product });
}

export async function deleteProduct(req, res) {
  const product = await findProduct(req.params.id);
  await product.deleteOne();
  res.json({ success: true, data: { _id: product._id } });
}
