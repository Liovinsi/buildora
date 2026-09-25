import mongoose from 'mongoose';

// Atomic sequences, e.g. per-business order numbers ("order:<businessId>").
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false });

export const Counter = mongoose.model('Counter', counterSchema);

// First value is start + 1 (e.g. order #1001).
export async function nextSequence(key, start = 1000) {
  const doc = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return start + doc.seq;
}
