import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Outreach from './models/Outreach.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Connecting to MongoDB...');

const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            // Fallback
            dotenv.config();
            if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is undefined');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const result = await Outreach.deleteMany({});
        console.log(`Deleted ${result.deletedCount} Outreach records.`);

        await mongoose.disconnect();
    } catch (e) {
        console.error('Error:', e);
    }
};

run();
