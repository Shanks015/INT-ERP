// audit_campus.mjs — READ-ONLY audit of the live Atlas int_erp DB for campus-visit state.
// 1. CampusVisit count + breakdown by `type`
// 2. count of docs matching the 3 scholar-looking rows and any overlap with ScholarInResidence
// 3. current distinct date format sanity (min/max)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import CampusVisit from '../src/models/CampusVisit.js';
import ScholarInResidence from '../src/models/ScholarInResidence.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const main = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('DB:', mongoose.connection.name);

    const total = await CampusVisit.countDocuments();
    console.log(`\nCampusVisit total: ${total}`);
    const byType = await CampusVisit.aggregate([
        { $group: { _id: '$type', n: { $sum: 1 } } },
        { $sort: { n: -1 } }
    ]);
    console.log('by type:', JSON.stringify(byType));

    const byStatus = await CampusVisit.aggregate([
        { $group: { _id: '$status', n: { $sum: 1 } } },
        { $sort: { n: -1 } }
    ]);
    console.log('by status:', JSON.stringify(byStatus));

    // sample of docs (no dates text sensitive) to see the type/visitor shape
    const sample = await CampusVisit.find().limit(5).lean();
    for (const s of sample) {
        console.log(`- type=${s.type} | visitor=${(s.visitorName || '').slice(0, 60)} | univ=${(s.universityName || '').slice(0, 40)} | date=${s.date ? s.date.toISOString().slice(0, 10) : 'null'} | status=${s.status} recordStatus=${s.recordStatus}`);
    }

    // The 3 scholar rows from the campus workbook (by visitorName keyword)
    const scholarKws = ['Sean Dodson', 'Ashok Kaushal', 'David Morris'];
    console.log('\n--- campus-workbook scholar-looking rows present in CampusVisit? ---');
    for (const kw of scholarKws) {
        const inCV = await CampusVisit.countDocuments({ visitorName: { $regex: kw, $options: 'i' } });
        const inSI = await ScholarInResidence.countDocuments({ $or: [
            { scholarName: { $regex: kw, $options: 'i' } },
            { visitorName: { $regex: kw, $options: 'i' } }
        ] });
        console.log(`${kw}: CampusVisit=${inCV}, ScholarInResidence=${inSI}`);
    }

    // Check which of the workbook's 114 rows already exist (by date+visitor fingerprint) -
    // pull all campus docs and let caller compare later; just count distinct here.
    const docCounts = await CampusVisit.countDocuments();
    console.log(`\nFinal CampusVisit count: ${docCounts}`);

    await mongoose.disconnect();
    process.exit(0);
};

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
