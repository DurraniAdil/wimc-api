import mongoose from 'mongoose';
import { CafeOwner } from './src/models/CafeOwner.js';
import { Transaction } from './src/models/Transaction.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function clearData() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("No MONGODB_URI in env");
    await mongoose.connect(uri);
    console.log("Connected to DB...");
    const d1 = await CafeOwner.deleteMany({});
    console.log(`Deleted ${d1.deletedCount} cafe owners.`);
    const d2 = await Transaction.deleteMany({});
    console.log(`Deleted ${d2.deletedCount} transactions.`);
    console.log("Finance demo data cleared successfully.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

clearData();
