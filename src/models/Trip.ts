import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface ITripParticipant {
  userId: mongoose.Types.ObjectId;
  name: string;
  rsvpStatus: 'pending' | 'going' | 'maybe' | 'declined';
}

export interface ITripPollOption {
  cafeId: string;
  cafeName: string;
  votes: mongoose.Types.ObjectId[];
}

export interface ITripPoll {
  options: ITripPollOption[];
  resolved: boolean;
}

export interface ITrip extends Document {
  creatorId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  eventDate: Date;
  selectedCafeId: string | null;
  selectedCafeName: string | null;
  status: 'planning' | 'confirmed' | 'completed' | 'cancelled';
  shareableCode: string;
  participants: ITripParticipant[];
  poll?: ITripPoll;
  createdAt: Date;
  updatedAt: Date;
}

const TripParticipantSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  rsvpStatus: {
    type: String,
    enum: ['pending', 'going', 'maybe', 'declined'],
    default: 'pending'
  }
}, { _id: false });

const TripPollOptionSchema = new Schema({
  cafeId: { type: String, required: true },
  cafeName: { type: String, required: true },
  votes: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const TripPollSchema = new Schema({
  options: [TripPollOptionSchema],
  resolved: { type: Boolean, default: false }
}, { _id: false });

const TripSchema = new Schema({
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  eventDate: { type: Date, required: true },
  selectedCafeId: { type: String, default: null },
  selectedCafeName: { type: String, default: null },
  status: {
    type: String,
    enum: ['planning', 'confirmed', 'completed', 'cancelled'],
    default: 'planning'
  },
  shareableCode: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(4).toString('hex')
  },
  participants: [TripParticipantSchema],
  poll: TripPollSchema
}, { timestamps: true });

export const Trip = mongoose.model<ITrip>('Trip', TripSchema);
