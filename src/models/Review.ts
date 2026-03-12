import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
    cafeId: string;
    anonymousId: string;
    rating: number;
    comment: string;
    createdAt: Date;
    isVisible: boolean;
}

const ReviewSchema: Schema = new Schema({
    cafeId: { type: String, required: true, index: true },
    anonymousId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
    isVisible: { type: Boolean, default: true }
});

export default mongoose.model<IReview>('Review', ReviewSchema);
