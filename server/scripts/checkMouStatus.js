import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const checkMouStatus = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const db = mongoose.connection.db;
        const partners = await db.collection('partners').find({}).limit(20).toArray();

        console.log('Sample mouStatus values (first 20):');
        partners.forEach((p, i) => {
            console.log(`${i + 1}. mouStatus: "${p.mouStatus || ''}" | university: ${p.university}`);
        });

        const statuses = await db.collection('partners').distinct('mouStatus');
        console.log('\n=== All unique mouStatus values in database ===');
        statuses.forEach(s => {
            console.log(`  - "${s}"`);
        });

        console.log('\n=== Count by status ===');
        const counts = await db.collection('partners').aggregate([
            { $group: { _id: '$mouStatus', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        counts.forEach(c => {
            console.log(`  "${c._id || 'EMPTY'}": ${c.count} records`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkMouStatus();
