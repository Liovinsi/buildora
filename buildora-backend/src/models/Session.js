import mongoose from 'mongoose';

// Login sessions. Only a SHA-256 hash of the token is stored. `kind` keeps customer sessions
// strictly separate from any future owner sessions.
const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    kind: { type: String, enum: ['demo-customer'], required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB removes expired sessions

export const Session = mongoose.model('Session', sessionSchema);
