
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StudentExchange from './src/models/StudentExchange.js';

dotenv.config();

const inspect = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const records = await StudentExchange.find({}).sort({ studentName: 1 });
    console.log(`Found ${records.length} StudentExchange records.`);

    records.forEach(r => {
        console.log({
            id: r._id,
            name: JSON.stringify(r.studentName),
            uni: JSON.stringify(r.exchangeUniversity),
            createdAt: r.createdAt
        });
    });

    process.exit(0);
};

inspect();
