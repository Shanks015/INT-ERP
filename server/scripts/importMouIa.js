import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import Partner from '../src/models/Partner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Helper to convert Excel date to JS Date
function excelDateToJSDate(serial) {
    if (!serial) return null;
    if (typeof serial === 'string') return null; // Will be handled by parseFlexibleDate
    if (typeof serial !== 'number') return null;

    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

// Helper to parse flexible date formats
function parseFlexibleDate(value) {
    if (!value) return null;

    // If it's a number, it's Excel date serial
    if (typeof value === 'number') {
        return excelDateToJSDate(value);
    }

    // If it's a string, parse DD/MM/YYYY or DD/MM/YY
    if (typeof value === 'string') {
        const cleaned = value.trim();
        const parts = cleaned.split('/');
        if (parts.length === 3) {
            let [day, month, year] = parts.map(p => parseInt(p));
            // Handle 2-digit years
            if (year < 100) year += 2000;
            return new Date(year, month - 1, day);
        }
    }

    return null;
}

// Helper to clean strings
const cleanStr = (str) => {
    if (str === undefined || str === null) return '';
    if (typeof str !== 'string') return String(str);
    return str.trim() === 'NA' ? '' : str.trim();
};

const importMouIa = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const excelPath = path.join(__dirname, '..', '..', 'MOU IA.xlsx');
        console.log(`📂 Reading Excel file: ${excelPath}`);

        const workbook = XLSX.readFile(excelPath);
        const sheetName = 'Sheet3';
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
            throw new Error(`Sheet "${sheetName}" not found in Excel file`);
        }

        const data = XLSX.utils.sheet_to_json(sheet);
        console.log(`Found ${data.length} records in ${sheetName}`);

        const partners = data.map((row, index) => {
            try {
                return {
                    completedOn: parseFlexibleDate(row['COMPLETED ON']) || excelDateToJSDate(row['COMPLETED ON']),
                    country: cleanStr(row['COUNTRY']),
                    university: cleanStr(row['UNIVERSITY']),
                    school: cleanStr(row['SCHOOL']),
                    mouStatus: cleanStr(row['STATUS']),
                    activeStatus: cleanStr(row['Active/ Inactive']) || 'Active',
                    contactPerson: cleanStr(row['Contact Person']),
                    email: cleanStr(row['Email Id']),
                    agreementType: cleanStr(row['Agreement']),
                    link: cleanStr(row['Link']),
                    submitted: parseFlexibleDate(row['Submitted']) || excelDateToJSDate(row['Submitted']),
                    signingDate: parseFlexibleDate(row['Signing Date']),
                    expiringDate: parseFlexibleDate(row['Expiring Date'])
                };
            } catch (err) {
                console.error(`Error parsing row ${index + 2}:`, err.message);
                return null;
            }
        }).filter(p => p !== null && p.university && p.country);

        console.log(`Mapped ${partners.length} valid partners`);

        // Clear existing partners
        await Partner.deleteMany({});
        console.log('🗑️  Cleared existing partners');

        // Insert new partners
        const result = await Partner.insertMany(partners, { ordered: false });
        console.log(`✅ Successfully imported ${result.length} partners`);

        // Show summary
        const active = await Partner.countDocuments({ activeStatus: 'Active' });
        const inactive = await Partner.countDocuments({ activeStatus: 'Inactive' });
        const expired = await Partner.countDocuments({ recordStatus: 'expired' });

        console.log('\n📊 Import Summary:');
        console.log(`   Total: ${result.length}`);
        console.log(`   Active Status: ${active}`);
        console.log(`   Inactive Status: ${inactive}`);
        console.log(`   Auto-Expired (past expiringDate): ${expired}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error importing MOU IA data:', error);
        process.exit(1);
    }
};

importMouIa();
