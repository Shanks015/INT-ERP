// push_two_modules.mjs — user-approved Replace: wipe ImmersionProgram + StudentExchange,
// then import each _CLEANED workbook through the real /api/import/:module endpoint
// using a minted JWT for the existing admin (admin@dsu.edu.in), exactly as the scholars push did.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import ImmersionProgram from '../src/models/ImmersionProgram.js';
import StudentExchange from '../src/models/StudentExchange.js';
import User from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API = 'http://localhost:5000';
const IMM_WB = path.join('C:', 'Users', 'saish', 'Downloads', 'Fresh Immersion_CLEANED.xlsx');
const EXC_WB = path.join('C:', 'Users', 'saish', 'Downloads', 'Frsh student exchange_CLEANED.xlsx');

const importFile = async (token, moduleName, filePath) => {
    const buf = fs.readFileSync(filePath);
    const form = new FormData();
    form.append('file', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), path.basename(filePath));
    const res = await fetch(`${API}/api/import/${moduleName}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
    });
    const body = await res.json().catch(() => ({}));
    console.log(`[${moduleName}] HTTP ${res.status}: ${JSON.stringify(body)}`);
    if (!res.ok) throw new Error(`${moduleName} import failed (HTTP ${res.status})`);
    return body;
};

const main = async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    // 1) Mint JWT for a real approved admin
    const admin = await User.findOne({ email: 'admin@dsu.edu.in' });
    if (!admin) throw new Error('admin@dsu.edu.in not found in DB');
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '30m' });
    console.log(`Auth as: ${admin.email} (role ${admin.role})`);

    // 2) Wipe both collections (replace strategy)
    const i0 = await ImmersionProgram.countDocuments();
    const e0 = await StudentExchange.countDocuments();
    const delI = await ImmersionProgram.deleteMany({});
    const delE = await StudentExchange.deleteMany({});
    console.log(`Wiped ImmersionProgram (${delI.deletedCount}) and StudentExchange (${delE.deletedCount}); before: ${i0}/${e0}`);

    // 3) Import both cleaned workbooks via the running server
    await importFile(token, 'immersion-programs', IMM_WB);
    await importFile(token, 'student-exchange', EXC_WB);

    // 4) Verify
    const i1 = await ImmersionProgram.countDocuments();
    const e1 = await StudentExchange.countDocuments();
    console.log(`After import: ImmersionProgram=${i1}, StudentExchange=${e1}`);

    await mongoose.disconnect();
    process.exit(0);
};
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
