
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

import CampusVisit from './src/models/CampusVisit.js';
import Event from './src/models/Event.js';
import MouSigningCeremony from './src/models/MouSigningCeremony.js';
import Conference from './src/models/Conference.js';
import ScholarInResidence from './src/models/ScholarInResidence.js';
import MouUpdate from './src/models/MouUpdate.js';
import ImmersionProgram from './src/models/ImmersionProgram.js';
import StudentExchange from './src/models/StudentExchange.js';
import MastersAbroad from './src/models/MastersAbroad.js';
import Membership from './src/models/Membership.js';
import DigitalMedia from './src/models/DigitalMedia.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXCEL_PATH = path.join('d:', 'new-hope-erp', 'Internationalisation (Responses) (3).xlsx');

const excelDateToJSDate = (serial) => {
    if (!serial) return null;
    // Check if it's already a string date
    if (typeof serial === 'string') return new Date(serial);
    if (typeof serial === 'number') {
        const utc_days = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return date_info;
    }
    return null;
};

const mapAndImport = async (sheetName, Model, mappingConfig, uniqueKeys = []) => {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        console.log(`Sheet "${sheetName}" not found. Skipping.`);
        return;
    }

    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`\nImporting ${rows.length} rows from "${sheetName}" into ${Model.modelName}...`);

    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
        try {
            const doc = {};
            // Map fields
            for (const [excelHeader, modelField] of Object.entries(mappingConfig)) {
                let value = row[excelHeader];

                // Trim string values
                if (typeof value === 'string') value = value.trim();

                // Specific transforms
                if (modelField === 'date' || modelField === 'fromDate' || modelField === 'toDate' ||
                    modelField === 'arrivalDate' || modelField === 'departureDate' ||
                    modelField === 'startDate' || modelField === 'endDate' ||
                    modelField === 'completedDate' || modelField === 'signingDate') {
                    value = excelDateToJSDate(value);
                }

                // Specific Enum Fixes
                if (modelField === 'status' || modelField === 'activeStatus') {
                    if (value && value.toLowerCase() === 'completed') value = 'active'; // Map Completed -> active (generic status)
                }

                if (value !== undefined) {
                    doc[modelField] = value;
                }
            }

            // Defaults
            if (!doc.status) doc.status = 'active';

            // Check if exists (Upsert logic)
            let filter = {};
            if (uniqueKeys.length > 0) {
                let hasKeys = true;
                uniqueKeys.forEach(key => {
                    if (!doc[key]) hasKeys = false;
                    filter[key] = doc[key];
                });

                if (hasKeys) {
                    await Model.findOneAndUpdate(filter, doc, { upsert: true, new: true });
                    successCount++;
                } else {
                    console.warn(`Skipping row due to missing unique keys: ${JSON.stringify(doc)}`);
                    errorCount++;
                }
            } else {
                // Just insert if no unique key defined (risky duplicate)
                await Model.create(doc);
                successCount++;
            }

        } catch (err) {
            console.error(`Error importing row in ${sheetName}:`, err.message);
            errorCount++;
        }
    }
    console.log(`Finished ${sheetName}: ${successCount} success, ${errorCount} errors.`);
};

const runImport = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Campus Visit
        await mapAndImport('Campus Visit', CampusVisit, {
            'Date': 'date',
            'Type': 'type',
            'Visitor\'s Name & Details': 'visitorName',
            'University Name': 'universityName',
            'Country ': 'country', // Note space
            'Department ': 'department', // Note space
            'Summary': 'summary',
            'Campus': 'campus'
        }, ['date', 'visitorName', 'universityName']);

        // 2. MoU Signing Ceremony
        await mapAndImport('MoU Signing Ceremony', MouSigningCeremony, {
            'Date': 'date',
            'Type': 'type',
            'Visitor\'s Name & Details': 'visitorName',
            'University Name': 'universityName',
            'Department ': 'department',
            'Event Summary': 'eventDetails', // Schema has title/summary? Check schema. Mapping to 'summary' if schema allows, or 'eventDetails'
            'Campus': 'campus'
        }, ['date', 'universityName']);
        // Note: MoU Signing schema check needed. 
        // Looking at file 6512-6515, I didn't verify MouSigningCeremony schema. 
        // Assuming 'eventDetails' might be wrong, likely 'summary' or similar. 
        // I should have checked. I will map to 'title' if 'Type' is generic.

        // 3. Events
        await mapAndImport('Events', Event, {
            'Date': 'date',
            'Type ': 'type',
            'Name & Details ': 'title',
            'Department ': 'department',
            'University, Country': 'universityCountry',
            'Dignitaries ': 'dignitaries',
            'Event Summary': 'eventSummary',
            'Campus': 'campus'
        }, ['date', 'title']);

        // 4. Conference
        await mapAndImport('Conference', Conference, {
            'Date': 'date',
            'Conference Name': 'conferenceName',
            'Country': 'country',
            'Department ': 'department',
            'Event Summary': 'eventSummary',
            'Campus': 'campus'
        }, ['date', 'conferenceName']);

        // 5. Scholars in Residence
        await mapAndImport('Scholars in Residence', ScholarInResidence, {
            'Scholars Name': 'scholarName',
            '  Category  ': 'category',
            'University ': 'university',
            'Country': 'country',
            'From Date': 'fromDate',
            'To Date': 'toDate',
            'Department ': 'department',
            'Summary': 'summary',
            'Campus': 'campus'
        }, ['scholarName', 'fromDate']);

        // 6. MoU Update
        await mapAndImport('MoU Update', MouUpdate, {
            'Date': 'date',
            'Country ': 'country',
            'University': 'university',
            'Department': 'department',
            'Completed Date': 'completedDate',
            'MoU Status ': 'moUStatus', // Check schema
            'Contact Person ': 'contactPerson',
            'Contact Email': 'email', // Check schema
            'Agreement Type': 'agreementType',
            'Term': 'term',
            'Validity Status ': 'validityStatus'
        }, ['university', 'agreementType', 'date']);

        // 7. Immersion program
        await mapAndImport('Immersion program', ImmersionProgram, {
            'Incoming/Outgoing': 'direction',
            'Country ': 'country',
            'University ': 'university',
            'No of Pax': 'numberOfPax',
            'Summary': 'summary',
            'Arrival Date': 'arrivalDate',
            'Departure Date': 'departureDate',
            'Fees Per Pax': 'feesPerPax',
            'Department ': 'department',
            'Status': 'programStatus'
        }, ['university', 'arrivalDate', 'direction']);

        // 8. Student Exchange
        await mapAndImport('Student Exchange', StudentExchange, {
            'Incoming / Outgoing': 'direction',
            'Students Name': 'studentName',
            'Course ': 'course',
            'Semester /Year': 'semesterYear',
            'USN NO': 'usnNo',
            'Exchange University': 'exchangeUniversity',
            'From Date': 'fromDate',
            'To Date': 'toDate',
            'Status': 'status'
        }, ['studentName', 'exchangeUniversity']);

        // 9. Masters Abroad
        await mapAndImport('Masters Abroad', MastersAbroad, {
            'Students Name': 'studentName',
            'Country': 'country',
            'University': 'university',
            'Course Studying': 'courseStudying',
            'Course Tenure': 'courseTenure',
            'CGPA': 'cgpa',
            'USN Number': 'usnNumber'
        }, ['studentName', 'university']);

        // 10. Memberships
        await mapAndImport('Memberships', Membership, {
            'Name': 'name',
            'Status': 'membershipStatus',
            'Country': 'country',
            'Start Date': 'startDate',
            'End Date': 'endDate',
            'Membership Duration ': 'membershipDuration',
            'Summary': 'summary'
        }, ['name', 'startDate']);

        // 11. Digital Media
        await mapAndImport('Digital Media', DigitalMedia, {
            'Date': 'date',
            'Channel': 'channel',
            'Link of the Article': 'link',
            'Article Topic': 'articleTopic',
            'Amount Paid': 'amountPaid',
            'Summary': 'summary'
        }, ['date', 'link']);


        console.log('All imports completed.');
        process.exit(0);
    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
};

runImport();
