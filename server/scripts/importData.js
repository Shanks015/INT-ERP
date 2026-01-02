
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import Models
import CampusVisit from '../src/models/CampusVisit.js';
import MouSigningCeremony from '../src/models/MouSigningCeremony.js';
import Event from '../src/models/Event.js';
import Conference from '../src/models/Conference.js';
import ScholarInResidence from '../src/models/ScholarInResidence.js';
import MouUpdate from '../src/models/MouUpdate.js';
import ImmersionProgram from '../src/models/ImmersionProgram.js';
import StudentExchange from '../src/models/StudentExchange.js';
import Membership from '../src/models/Membership.js';
import DigitalMedia from '../src/models/DigitalMedia.js';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const excelPath = path.join(__dirname, '..', '..', 'Internationalisation (Responses) (1).xlsx');

// Load env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Helper to convert Excel date to JS Date
function excelDateToJSDate(serial) {
    if (!serial) return null;
    if (typeof serial === 'string') return new Date(serial);
    if (typeof serial !== 'number') return null;

    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

// Helper to clean strings
const cleanStr = (str) => {
    if (str === undefined || str === null) return '';
    if (typeof str !== 'string') return String(str);
    return str.trim() === 'NA' ? '' : str.trim();
};

// Smart key finder
const findKey = (row, ...candidates) => {
    const keys = Object.keys(row);
    // 1. Try exact match
    for (const c of candidates) {
        if (row[c] !== undefined) return c;
    }
    // 2. Try case-insensitive trim match
    for (const c of candidates) {
        const found = keys.find(k => k.trim().toLowerCase() === c.trim().toLowerCase());
        if (found) return found;
    }
    // 3. Try fuzzy includes for "Upload" if candidates has "Upload"
    if (candidates.some(c => c.includes('Upload'))) {
        const found = keys.find(k => k.toLowerCase().includes('upload') && k.toLowerCase().includes('zip'));
        if (found) return found;
    }
    return null;
};

const getVal = (row, ...candidates) => {
    const key = findKey(row, ...candidates);
    return key ? row[key] : undefined;
};

const processSheet = async (sheetName, Model, mapFn) => {
    try {
        console.log(`\nProcessing Sheet: ${sheetName}`);
        const workbook = XLSX.readFile(excelPath);
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            console.warn(`⚠️ Sheet "${sheetName}" not found. Skipping.`);
            return;
        }

        const data = XLSX.utils.sheet_to_json(sheet);
        if (data.length === 0) {
            console.warn(`⚠️ Sheet "${sheetName}" is empty. Skipping.`);
            return;
        }

        console.log(`Found ${data.length} records.`);

        let successCount = 0;
        const mapped = [];

        data.forEach((row, index) => {
            try {
                const item = mapFn(row);
                if (item) mapped.push(item);
            } catch (err) {
                console.error(`Error mapping row ${index + 1}:`, err);
            }
        });

        if (mapped.length > 0) {
            // Validate first item for debugging
            // console.log(`First record preview:`, JSON.stringify(mapped[0], null, 2));

            await Model.deleteMany({});

            try {
                // Use insertMany with ordered: false to continue on error
                const result = await Model.insertMany(mapped, { ordered: false });
                console.log(`✅ Successfully imported ${result.length} records into ${Model.modelName}`);
            } catch (insertError) {
                console.error(`❌ Partial/Full validation failure for ${Model.modelName}:`);
                if (insertError.insertedDocs) {
                    console.log(`✅ Successfully inserted ${insertError.insertedDocs.length} records (partial success)`);
                }

                if (insertError.writeErrors) {
                    console.log(`Failed records: ${insertError.writeErrors.length}`);
                    // Log first error to help debug
                    if (insertError.writeErrors.length > 0) {
                        console.error('Sample Error:', insertError.writeErrors[0].errmsg);
                    }
                } else {
                    console.error(insertError.message);
                }
            }
        } else {
            console.warn('No records mapped successfully.');
        }

    } catch (error) {
        console.error(`❌ Critical error processing sheet ${sheetName}:`, error);
    }
};

const importData = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        if (!fs.existsSync(excelPath)) {
            throw new Error(`Excel file not found at ${excelPath}`);
        }

        // 1. Campus Visit
        await processSheet('Campus Visit', CampusVisit, (row) => ({
            date: excelDateToJSDate(getVal(row, 'Date')),
            type: cleanStr(getVal(row, 'Type')),
            visitorName: cleanStr(getVal(row, "Visitor's Name & Details", "Visitor Name")),
            country: cleanStr(getVal(row, 'Country')),
            universityName: cleanStr(getVal(row, 'University Name', 'University')),
            summary: cleanStr(getVal(row, 'Summary')),
            department: cleanStr(getVal(row, 'Department')),
            campus: cleanStr(getVal(row, 'Campus')),
            driveLink: cleanStr(getVal(row, 'Campus Visit- Upload Zip File', 'Upload', 'driveLink'))
        }));

        // 2. MoU Signing Ceremony
        await processSheet('MoU Signing Ceremony', MouSigningCeremony, (row) => ({
            date: excelDateToJSDate(getVal(row, 'Date')),
            type: cleanStr(getVal(row, 'Type')),
            visitorName: cleanStr(getVal(row, "Visitor's Name & Details")),
            university: cleanStr(getVal(row, 'University Name')),
            department: cleanStr(getVal(row, 'Department')),
            eventSummary: cleanStr(getVal(row, 'Event Summary')),
            campus: cleanStr(getVal(row, 'Campus')),
            driveLink: cleanStr(getVal(row, 'MoU Signing Ceremony Upload Zip File', 'Upload'))
        }));

        // 3. Events
        await processSheet('Events', Event, (row) => ({
            date: excelDateToJSDate(getVal(row, 'Date')),
            type: cleanStr(getVal(row, 'Type')),
            title: cleanStr(getVal(row, 'Name & Details')),
            department: cleanStr(getVal(row, 'Department')),
            universityCountry: cleanStr(getVal(row, 'University, Country', 'Venue')),
            dignitaries: cleanStr(getVal(row, 'Dignitaries')),
            eventSummary: cleanStr(getVal(row, 'Event Summary')),
            campus: cleanStr(getVal(row, 'Campus')),
            driveLink: cleanStr(getVal(row, 'Events - Upload Zip File', 'Upload'))
        }));

        // 4. Conference
        await processSheet('Conference', Conference, (row) => ({
            date: excelDateToJSDate(getVal(row, 'Date')),
            conferenceName: cleanStr(getVal(row, 'Conference Name')),
            country: cleanStr(getVal(row, 'Country')),
            department: cleanStr(getVal(row, 'Department')),
            eventSummary: cleanStr(getVal(row, 'Event Summary')),
            campus: cleanStr(getVal(row, 'Campus')),
            driveLink: cleanStr(getVal(row, 'Conference - Upload Zip File', 'Upload'))
        }));

        // 5. Scholars in Residence
        await processSheet('Scholars in Residence', ScholarInResidence, (row) => ({
            scholarName: cleanStr(getVal(row, 'Scholars Name')),
            university: cleanStr(getVal(row, 'University')),
            country: cleanStr(getVal(row, 'Country')),
            department: cleanStr(getVal(row, 'Department')),
            fromDate: excelDateToJSDate(getVal(row, 'From Date')),
            toDate: excelDateToJSDate(getVal(row, 'To Date')),
            category: cleanStr(getVal(row, 'Category')),
            summary: cleanStr(getVal(row, 'Summary')),
            campus: cleanStr(getVal(row, 'Campus')),
            driveLink: cleanStr(getVal(row, 'Scholars in Residence - Upload Zip File', 'Upload'))
        }));

        // 6. MoU Update
        await processSheet('MoU Update', MouUpdate, (row) => ({
            date: excelDateToJSDate(getVal(row, 'Date')),
            university: cleanStr(getVal(row, 'University')),
            country: cleanStr(getVal(row, 'Country')),
            department: cleanStr(getVal(row, 'Department')),
            completedDate: excelDateToJSDate(getVal(row, 'Completed Date')),
            mouStatus: cleanStr(getVal(row, 'MoU Status')),
            contactPerson: cleanStr(getVal(row, 'Contact Person')),
            contactEmail: cleanStr(getVal(row, 'Contact Email')),
            agreementType: cleanStr(getVal(row, 'Agreement Type')),
            term: cleanStr(getVal(row, 'Term')),
            validityStatus: cleanStr(getVal(row, 'Validity Status')),
            driveLink: cleanStr(getVal(row, 'MoU Update Upload Zip File', 'Upload'))
        }));

        // 7. Immersion program
        await processSheet('Immersion program', ImmersionProgram, (row) => ({
            programStatus: cleanStr(getVal(row, 'Status')),
            direction: cleanStr(getVal(row, 'Incoming/Outgoing')),
            university: cleanStr(getVal(row, 'University')),
            country: cleanStr(getVal(row, 'Country')),
            numberOfPax: getVal(row, 'No of Pax'),
            summary: cleanStr(getVal(row, 'Summary')),
            arrivalDate: excelDateToJSDate(getVal(row, 'Arrival Date')),
            departureDate: excelDateToJSDate(getVal(row, 'Departure Date')),
            feesPerPax: getVal(row, 'Fees Per Pax'),
            department: cleanStr(getVal(row, 'Department')),
            driveLink: cleanStr(getVal(row, 'Immersion Program - Upload Zip File', 'Upload'))
        }));

        // 8. Student Exchange
        await processSheet('Student Exchange', StudentExchange, (row) => ({
            direction: cleanStr(getVal(row, 'Incoming / Outgoing')),
            studentName: cleanStr(getVal(row, 'Students Name')),
            course: cleanStr(getVal(row, 'Course')),
            semesterYear: cleanStr(getVal(row, 'Semester /Year')),
            usnNo: cleanStr(getVal(row, 'USN NO')),
            exchangeUniversity: cleanStr(getVal(row, 'Exchange University')),
            fromDate: excelDateToJSDate(getVal(row, 'From Date')),
            toDate: excelDateToJSDate(getVal(row, 'To Date')),
            exchangeStatus: cleanStr(getVal(row, 'Status')),
            driveLink: cleanStr(getVal(row, 'Student Exchange - Upload Zip File', 'Upload'))
        }));

        // 10. Memberships
        await processSheet('Memberships', Membership, (row) => ({
            date: excelDateToJSDate(getVal(row, 'Date')),
            membershipStatus: cleanStr(getVal(row, 'Status')),
            name: cleanStr(getVal(row, 'Name')),
            summary: cleanStr(getVal(row, 'Summary')),
            country: cleanStr(getVal(row, 'Country')),
            startDate: excelDateToJSDate(getVal(row, 'Start Date')),
            endDate: excelDateToJSDate(getVal(row, 'End Date')),
            driveLink: cleanStr(getVal(row, 'Memberships - Upload Zip File', 'Upload'))
        }));

        // 11. Digital Media
        await processSheet('Digital Media', DigitalMedia, (row) => ({
            date: excelDateToJSDate(getVal(row, 'Date')),
            channel: cleanStr(getVal(row, 'Channel')),
            articleLink: cleanStr(getVal(row, 'Link of the Article')),
            articleTopic: cleanStr(getVal(row, 'Article Topic')),
            amountPaid: cleanStr(getVal(row, 'Amount Paid')),
            summary: cleanStr(getVal(row, 'Summary')),
            driveLink: cleanStr(getVal(row, 'Digital Media - Upload Zip File', 'Upload'))
        }));

        console.log('\n✨ Import process completed.');
        process.exit(0);

    } catch (error) {
        console.error('❌ FATAL ERROR During Import:', error);
        process.exit(1);
    }
};

importData();
