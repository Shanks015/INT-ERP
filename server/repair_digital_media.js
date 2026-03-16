
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import DigitalMedia from './src/models/DigitalMedia.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const EXCEL_PATH = path.join('d:', 'new-hope-erp', 'Internationalisation (Responses) (3).xlsx');

const excelDateToJSDate = (serial) => {
    if (!serial) return null;
    if (typeof serial === 'string') return new Date(serial);
    if (typeof serial === 'number') {
        const utc_days = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return date_info;
    }
    return null;
};

const repairDigitalMedia = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // 1. Clear Collection
        await DigitalMedia.deleteMany({});
        console.log('Cleared DigitalMedia collection.');

        // 2. Read Excel
        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheet = workbook.Sheets['Digital Media'];
        const rows = XLSX.utils.sheet_to_json(sheet);
        console.log(`Found ${rows.length} rows in Excel.`);

        // 3. Import
        let count = 0;
        for (const row of rows) {
            const doc = {
                date: excelDateToJSDate(row['Date']),
                channel: row['Channel'],
                link: row['Link of the Article'],
                articleTopic: row['Article Topic'],
                amountPaid: row['Amount Paid'],
                summary: row['Summary'],
                status: 'active'
            };

            // Basic insert
            await DigitalMedia.create(doc);
            count++;
        }
        console.log(`Re-imported ${count} DigitalMedia records.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

repairDigitalMedia();
