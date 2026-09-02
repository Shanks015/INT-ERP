// verify_import.mjs — post-push verification: feesCurrency, notes, dates, country cleaning
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ImmersionProgram from '../src/models/ImmersionProgram.js';
import StudentExchange from '../src/models/StudentExchange.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dstr = (d) => d ? `${String(d.getUTCDate()).padStart(2, '0')}/${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]}/${d.getUTCFullYear()}` : '-';

const main = async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    const imms = await ImmersionProgram.find().lean();
    const exs = await StudentExchange.find().lean();

    console.log('=== IMMERSION (' + imms.length + ') ===');
    for (const i of imms) {
        console.log(`${i.direction}|${i.programStatus}|${i.university}|${i.country}|pax=${i.numberOfPax}|fees=${i.feesPerPax ?? '-'} ${i.feesCurrency ?? ''}|${dstr(i.arrivalDate)}-${dstr(i.departureDate)}|rec=${i.recordStatus}|notes=${i.notes || '-'}`);
    }
    console.log('\n=== EXCHANGE (' + exs.length + ') ===');
    for (const x of exs) {
        console.log(`${x.direction}|${x.studentName}|${x.exchangeUniversity}|${x.country || '-'}|${x.exchangeStatus || '-'}|${x.semesterYear || '-'}|${dstr(x.fromDate)}-${dstr(x.toDate)}|rec=${x.recordStatus}|notes=${x.notes || '-'}`);
    }

    console.log('\n=== CHECKS ===');
    const immNoCurr = imms.filter(i => i.feesPerPax != null && !i.feesCurrency).length;
    const immWithNotes = imms.filter(i => i.notes).length;
    const excWithNotes = exs.filter(i => i.notes).length;
    const missCountry = exs.filter(x => !x.country).length;
    const missExchStatus = exs.filter(x => !x.exchangeStatus).length;
    const noDateRows = exs.filter(x => !x.fromDate || !x.toDate).map(x => x.studentName);
    console.log(`Immersion with fees but NO currency: ${immNoCurr}`);
    console.log(`Immersion with notes: ${immWithNotes} | Exchange with notes: ${excWithNotes}`);
    console.log(`Exchange missing country: ${missCountry} | missing exchangeStatus: ${missExchStatus}`);
    console.log(`Exchange rows missing from/to dates: ${JSON.stringify(noDateRows)}`);
    const badCountry = [...new Set([...imms, ...exs].map(x => x.country).filter(Boolean))].filter(c => /Kazak|UK$|^US$|^USA$/i.test(c));
    console.log(`Uncleaned country values still present: ${JSON.stringify(badCountry)}`);

    await mongoose.disconnect();
    process.exit(0);
};
main().catch((e) => { console.error(e); process.exit(1); });
