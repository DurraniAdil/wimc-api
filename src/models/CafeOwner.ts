import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ICafeOwner extends Document {
  name: string;
  email: string;
  password: string;
  cafeId: string;          // Links to Cafe.id (e.g. 'cafe-003')
  cafeName: string;        // Denormalized for quick display
  role: 'owner' | 'viewer';
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const CafeOwnerSchema: Schema = new Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  cafeId:   { type: String, required: true },
  cafeName: { type: String, required: true },
  role:     { type: String, enum: ['owner', 'viewer'], default: 'owner' },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before save
CafeOwnerSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password as string, 12);
});

// Compare method
CafeOwnerSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// Remove sensitive info from JSON
CafeOwnerSchema.set('toJSON', {
  transform: (_, ret: any) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

export const CafeOwner = mongoose.model<ICafeOwner>('CafeOwner', CafeOwnerSchema);
