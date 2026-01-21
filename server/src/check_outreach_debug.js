import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Outreach from './models/Outreach.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env from parent directory (server/)
// Adjust path if necessary. server.js is in src/, so .env is likely in ../.env
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Connecting to MongoDB...', process.env.MONGODB_URI ? 'URI found' : 'URI NOT FOUND');

const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            // Fallback try loading from current dir if run from server root
            dotenv.config();
            if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is undefined');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const total = await Outreach.countDocuments();
        console.log(`Total Outreach Records: ${total}`);

        const recent = await Outreach.find().sort({ createdAt: -1 }).limit(5);
        console.log('Recent 5 records:');
        recent.forEach(r => {
            console.log(JSON.stringify({
                id: r._id,
                name: r.name,
                uni: r.university,
                country: r.country,
                email: r.email,
                createdAt: r.createdAt,
                status: r.status,
                approvalStatus: r.approvalStatus
            }, null, 2));
        });

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

run();
