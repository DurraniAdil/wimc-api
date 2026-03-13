import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  picture?: string;
  joinedAt: Date;
  reviewCount: number;
  collections: {
    hearted: string[];
    visited: Array<{
      id: string;
      date: string;
    }>;
  };
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, minlength: 6 },
  picture: { type: String, default: '' },
  joinedAt: { type: Date, default: Date.now },
  reviewCount: { type: Number, default: 0 },
  collections: {
    hearted: [{ type: String }],
    visited: [{
      id: { type: String, required: true },
      date: { type: String, required: true }
    }]
  }
});

// Hash password before save
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  
  try {
    this.password = await bcrypt.hash(this.password as string, 12);
  } catch (err: any) {
    throw err;
  }
});

// Compare method
UserSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// Remove sensitive info when converting to JSON
UserSchema.set('toJSON', {
  transform: (_, ret: any) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

export const User = mongoose.model<IUser>('User', UserSchema);
