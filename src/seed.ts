import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Cafe } from './models/Cafe.js';

dotenv.config();

const seedDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        await mongoose.connect(mongoUri);
        console.log('🍃 Connected to MongoDB for seeding');

        // Read JSON
        const dataPath = join(process.cwd(), 'data', 'cafes.json');
        const cafes = JSON.parse(readFileSync(dataPath, 'utf-8'));

        // Clear existing collection
        await Cafe.deleteMany({});
        console.log('🗑️  Cleared existing Cafe collection');

        // Insert all documents
        await Cafe.insertMany(cafes);
        console.log(`✅ Successfully seeded ${cafes.length} cafes into MongoDB`);

        // Disconnect
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
        process.exit(0);
    } catch (error: any) {
        console.error(`❌ Seeding failed: ${error.message}`);
        process.exit(1);
    }
};

seedDB();
