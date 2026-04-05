import mongoose, { Schema, Document } from 'mongoose';

export const TRANSACTION_CATEGORIES = [
  'Sales',
  'Beverages',
  'Food',
  'Supplies',
  'Rent',
  'Utilities',
  'Staff',
  'Marketing',
  'Equipment',
  'Maintenance',
  'Other'
] as const;

export type TransactionCategory = typeof TRANSACTION_CATEGORIES[number];

export interface ITransaction extends Document {
  cafeId: string;
  ownerId: mongoose.Types.ObjectId;
  type: 'income' | 'expense';
  category: TransactionCategory;
  amount: number;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema({
  cafeId:      { type: String, required: true, index: true },
  ownerId:     { type: Schema.Types.ObjectId, ref: 'CafeOwner', required: true },
  type:        { type: String, enum: ['income', 'expense'], required: true },
  category:    { type: String, required: true },
  amount:      { type: Number, required: true, min: 0 },
  description: { type: String, required: true, trim: true },
  date:        { type: Date, required: true, index: true },
}, {
  timestamps: true  // auto createdAt + updatedAt
});

// Compound index for efficient queries
TransactionSchema.index({ cafeId: 1, date: -1 });
TransactionSchema.index({ cafeId: 1, type: 1 });
TransactionSchema.index({ cafeId: 1, category: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
