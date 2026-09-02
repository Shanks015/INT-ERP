// backup_imm_exchange.mjs — snapshot ImmersionProgram + StudentExchange to JSON in Downloads
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ImmersionProgram from '../src/models/ImmersionProgram.js';
import StudentExchange from '../src/models/StudentExchange.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OUT = path.join('C:', 'Users', 'saish', 'Downloads', `int_erp_backup_imm_exchange_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`);

const main = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const imms = await ImmersionProgram.find().lean();
    const exs = await StudentExchange.find().lean();
    const payload = {
        backedUpAt: new Date().toISOString(),
        collections: {
            immersionprograms: { count: imms.length, docs: imms },
            studentexchanges: { count: exs.length, docs: exs }
        }
    };
    fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
    console.log(`Backup written: ${OUT}`);
    console.log(`  ImmersionProgram: ${imms.length} docs`);
    console.log(`  StudentExchange: ${exs.length} docs`);
    await mongoose.disconnect();
    process.exit(0);
};
main().catch((e) => { console.error(e); process.exit(1); });
