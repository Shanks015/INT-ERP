
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StudentExchange from './src/models/StudentExchange.js';

dotenv.config();

const inspect = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const records = await StudentExchange.find({}).sort({ studentName: 1 });
    console.log(`\nFound ${records.length} StudentExchange records.`);

    console.log('--- START DUMP ---');
    records.forEach((r, i) => {
        console.log(`[${i}] Name: "${r.studentName}" | Uni: "${r.exchangeUniversity}" | ID: ${r._id}`);
    });
    console.log('--- END DUMP ---');

    process.exit(0);
};

inspect();
