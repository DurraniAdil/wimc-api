import mongoose, { Schema, Document } from 'mongoose';

export interface ICafe extends Document {
    id: string;
    name: string;
    area: string;
    address: string;
    latitude: number;
    longitude: number;
    googleMapsUrl?: string;
    phone?: string;
    instagram?: string;
    website?: string;
    openingHours: string;
    closedOn: string;
    priceForTwo: number;
    cheapestItem?: string;
    popularItem?: string;
    vibes: string[];
    noiseLevel: string;
    lighting: string;
    music: string;
    amenities: {
        wifi: boolean;
        ac: boolean;
        outdoorSeating: boolean;
        powerOutlets: boolean;
        boardGames: boolean;
        parking: boolean;
    };
    description: string;
    photos: string[];
    isNewCafe: boolean;
    isTrending: boolean;
    addedOn: string;
    verified: boolean;
    rating: number;
    zone: string;
}

const cafeSchema = new Schema<ICafe>({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    area: { type: String, required: true },
    address: { type: String, default: '' },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    googleMapsUrl: { type: String, default: '' },
    phone: { type: String, default: '' },
    instagram: { type: String, default: '' },
    website: { type: String, default: '' },
    openingHours: { type: String, required: true },
    closedOn: { type: String, default: '' },
    priceForTwo: { type: Number, required: true },
    cheapestItem: { type: String, default: '' },
    popularItem: { type: String, default: '' },
    vibes: { type: [String], default: [] },
    noiseLevel: { type: String, default: '' },
    lighting: { type: String, default: '' },
    music: { type: String, default: '' },
    amenities: {
        wifi: { type: Boolean, default: false },
        ac: { type: Boolean, default: false },
        outdoorSeating: { type: Boolean, default: false },
        powerOutlets: { type: Boolean, default: false },
        boardGames: { type: Boolean, default: false },
        parking: { type: Boolean, default: false },
    },
    description: { type: String, default: '' },
    photos: { type: [String], default: [] },
    isNewCafe: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    addedOn: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    zone: { type: String, default: '' },
});

export const Cafe = mongoose.model<ICafe>('Cafe', cafeSchema);
