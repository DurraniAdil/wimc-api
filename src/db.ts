import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI as string);
        console.log(`\n  🍃  MongoDB Connected: ${conn.connection.host}\n`);
    } catch (error: any) {
        console.error(`\n  ❌  Error: ${error.message}\n`);
        process.exit(1);
    }
};
