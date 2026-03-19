import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
    cafeId: string;
    userId: mongoose.Types.ObjectId;
    anonymousId: string;
    rating: number;
    comment: string;
    createdAt: Date;
    isVisible: boolean;
}

const ReviewSchema: Schema = new Schema({
    cafeId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    anonymousId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 },
    isVisible: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model<IReview>('Review', ReviewSchema);
