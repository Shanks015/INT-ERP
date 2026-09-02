// refix_immersion.mjs — wipe ImmersionProgram only, re-import cleaned workbook via real endpoint
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import ImmersionProgram from '../src/models/ImmersionProgram.js';
import User from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API = 'http://localhost:5000';
const IMM_WB = path.join('C:', 'Users', 'saish', 'Downloads', 'Fresh Immersion_CLEANED.xlsx');

const main = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const admin = await User.findOne({ email: 'admin@dsu.edu.in' });
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '30m' });

    await ImmersionProgram.deleteMany({});
    console.log('Wiped ImmersionProgram for re-import');

    const buf = fs.readFileSync(IMM_WB);
    const form = new FormData();
    form.append('file', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), path.basename(IMM_WB));
    const res = await fetch(`${API}/api/import/immersion-programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
    });
    const body = await res.json().catch(() => ({}));
    console.log(`[immersion-programs] HTTP ${res.status}: ${JSON.stringify(body)}`);

    const docs = await ImmersionProgram.find().select('university feesPerPax feesCurrency numberOfPax direction programStatus').lean();
    docs.forEach(d => console.log(JSON.stringify(d)));

    await mongoose.disconnect();
    process.exit(0);
};
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
