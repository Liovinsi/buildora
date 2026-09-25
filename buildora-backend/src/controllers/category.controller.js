import { CATEGORIES } from '../config/categories.js';

export const listCategories = (req, res) => {
  res.json({ success: true, data: CATEGORIES });
};
