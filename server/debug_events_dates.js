
import mongoose from 'mongoose';
import Event from './src/models/Event.js';
import fs from 'fs';
import path from 'path';

const run = async () => {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
        const MONGODB_URI = uriMatch[1].trim();

        await mongoose.connect(MONGODB_URI);

        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        console.log('Ranges:', {
            thisMonth: startOfThisMonth,
            lastMonthStart: startOfLastMonth,
            lastMonthEnd: endOfLastMonth
        });

        const thisMonthCount = await Event.countDocuments({
            date: { $gte: startOfThisMonth }
        });

        const lastMonthCount = await Event.countDocuments({
            date: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        console.log('This Month Events:', thisMonthCount);
        console.log('Last Month Events:', lastMonthCount);

        // Check if any events exist with status 'active' just to be sure
        const activeEvents = await Event.countDocuments({ status: 'active' });
        console.log('Events with status=active (should be 0/low):', activeEvents);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
