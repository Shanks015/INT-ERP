import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Partner from './src/models/Partner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
    .then(async () => {
        const total = await Partner.countDocuments({});
        const active = await Partner.countDocuments({ activeStatus: 'Active' });
        const inactive = await Partner.countDocuments({ activeStatus: 'Inactive' });
        const expired = await Partner.countDocuments({ activeStatus: 'Expired' });
        const approved = await Partner.countDocuments({ status: 'approved' });
        const activeLower = await Partner.countDocuments({ status: 'active' });

        console.log(`TOTAL: ${total}`);
        console.log(`ACTIVE_STATUS_ACTIVE: ${active}`);
        console.log(`ACTIVE_STATUS_INACTIVE: ${inactive}`);
        console.log(`ACTIVE_STATUS_EXPIRED: ${expired}`);
        console.log(`STATUS_APPROVED: ${approved}`);
        console.log(`STATUS_ACTIVE: ${activeLower}`);

        process.exit(0);
    })
    .catch(err => {
        console.log('ERROR');
        process.exit(1);
    });
