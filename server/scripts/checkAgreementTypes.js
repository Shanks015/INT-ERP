import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const checkAgreementTypes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const db = mongoose.connection.db;

        // Check agreementType values
        const agreementTypes = await db.collection('partners').distinct('agreementType');
        console.log('=== All Agreement Type values in database ===');
        agreementTypes.forEach(s => {
            console.log(`  - "${s}"`);
        });

        const counts = await db.collection('partners').aggregate([
            { $group: { _id: '$agreementType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        console.log('\n=== Count by Agreement Type ===');
        counts.forEach(c => {
            console.log(`  "${c._id || 'EMPTY'}": ${c.count} records`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkAgreementTypes();
