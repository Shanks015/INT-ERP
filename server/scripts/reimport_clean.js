import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

import CampusVisit from '../src/models/CampusVisit.js';
import Event from '../src/models/Event.js';
import MouSigningCeremony from '../src/models/MouSigningCeremony.js';
import Conference from '../src/models/Conference.js';
import ScholarInResidence from '../src/models/ScholarInResidence.js';
import MouUpdate from '../src/models/MouUpdate.js';
import ImmersionProgram from '../src/models/ImmersionProgram.js';
import StudentExchange from '../src/models/StudentExchange.js';
import MastersAbroad from '../src/models/MastersAbroad.js';
import Membership from '../src/models/Membership.js';
import DigitalMedia from '../src/models/DigitalMedia.js';
import User from '../src/models/User.js';
import MeetingTracker from '../src/models/MeetingTracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXCEL_PATH = path.join(__dirname, '..', '..', 'Internationalisation (Responses).xlsx');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONTH_ABBR = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const excelDateToJSDate = (serial) => {
    if (!serial) return null;
    if (serial instanceof Date) return serial;
    if (typeof serial === 'string') {
        const cleaned = serial.trim();
        if (!cleaned) return null;
        // project date text format dd/MMM/yyyy, e.g. "02/Sep/2026"
        let m = cleaned.match(/^(\d{1,2})[/\-.\s]\s*([A-Za-z]{3,9})[/\-.\s]\s*(\d{2,4})$/);
        if (m) {
            const day = +m[1];
            const mon = String(m[2]).slice(0, 3).toLowerCase();
            let yr = +m[3];
            if (yr < 100) yr += 2000;
            if (MONTH_ABBR[mon] !== undefined) {
                const d = new Date(Date.UTC(yr, MONTH_ABBR[mon], day));
                if (d.getUTCFullYear() === yr && d.getUTCMonth() === MONTH_ABBR[mon] && d.getUTCDate() === day) return d;
            }
        }
        const parsed = new Date(cleaned);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof serial === 'number') {
        const utc_days = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return date_info;
    }
    return null;
};

const parseExcelTime = (value) => {
    if (!value) return '';
    if (typeof value === 'number') {
        const totalMinutes = Math.round(value * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return String(value).trim();
};

const normalizeRow = (row) => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
        const trimmedKey = key.trim().replace(/\s+/g, ' '); // normalizes multiple spaces to a single space
        normalized[trimmedKey] = typeof value === 'string' ? value.trim() : value;
    }
    return normalized;
};

const getDriveLink = (row) => {
    const linkKey = Object.keys(row).find(k => k.toLowerCase().includes('upload zip') || k.toLowerCase().includes('drive link'));
    return linkKey ? row[linkKey] : null;
};

const cleanAndImport = async (sheetName, Model, mappingConfig, uniqueKeys = [], createdBy = null) => {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        console.log(`[!] Sheet "${sheetName}" not found in Excel. Skipping.`);
        return;
    }

    const rawRows = XLSX.utils.sheet_to_json(sheet);
    console.log(`\n[*] Processing ${rawRows.length} rows from sheet "${sheetName}"...`);

    // 1. Clear the collection completely
    const deleteRes = await Model.deleteMany({});
    console.log(`[-] Cleared ${deleteRes.deletedCount} existing records from ${Model.modelName} collection.`);

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    const seenKeys = new Set();
    const docsToInsert = [];

    for (const rawRow of rawRows) {
        const row = normalizeRow(rawRow);
        try {
            const doc = {
                status: 'active',
                recordStatus: 'active',
                createdBy: createdBy,
                updatedBy: createdBy
            };

            // Map standard fields
            for (const [excelHeader, modelField] of Object.entries(mappingConfig)) {
                let value = row[excelHeader];

                // Convert Dates
                if (modelField === 'date' || modelField === 'fromDate' || modelField === 'toDate' ||
                    modelField === 'arrivalDate' || modelField === 'departureDate' ||
                    modelField === 'startDate' || modelField === 'endDate' ||
                    modelField === 'completedDate' || modelField === 'signingDate') {
                    value = excelDateToJSDate(value);
                }

                // Handle numbers
                if (modelField === 'numberOfPax' || modelField === 'feesPerPax' || modelField === 'cgpa' ||
                    modelField === 'qsRanking' || modelField === 'durationDays') {
                    if (value !== undefined && value !== null && value !== '') {
                        const num = Number(String(value).replace(/,/g, ''));
                        value = isNaN(num) || num <= 0 ? undefined : num;
                    }
                }

                if (value !== undefined && value !== null) {
                    doc[modelField] = value;
                }
            }

            // Skip empty rows (rows that don't have any mapped fields with actual content)
            const mappedValues = Object.values(mappingConfig).map(field => doc[field]);
            const hasData = mappedValues.some(val => val !== undefined && val !== null && String(val).trim() !== '');
            if (!hasData) {
                // Completely empty row, skip silently
                continue;
            }

            // Map driveLink robustly
            const driveLink = getDriveLink(row);
            if (driveLink) {
                doc.driveLink = driveLink;
            }

            // Check duplicate rows inside Excel sheet using composite unique keys
            if (uniqueKeys.length > 0) {
                const uniqueVal = uniqueKeys.map(k => {
                    const val = doc[k];
                    if (val instanceof Date) return val.getTime();
                    return String(val || '').toLowerCase().trim();
                }).join('|');

                if (seenKeys.has(uniqueVal)) {
                    duplicateCount++;
                    continue; // Skip duplicates within the spreadsheet itself
                }
                seenKeys.add(uniqueVal);
            }

            docsToInsert.push(doc);
        } catch (err) {
            console.error(`[Error] Failed parsing row in "${sheetName}":`, err.message);
            console.error('Row data was:', JSON.stringify(rawRow));
            errorCount++;
        }
    }

    if (docsToInsert.length > 0) {
        try {
            // Bulk insert to maximize speed and efficiency
            const inserted = await Model.insertMany(docsToInsert, { ordered: false });
            successCount = inserted.length;
        } catch (err) {
            if (err.name === 'ValidationError') {
                console.error(`\n[ValidationError] Failed to validate some documents in "${sheetName}":`);
                for (const [field, errorObj] of Object.entries(err.errors)) {
                    console.error(`  - Field "${field}": ${errorObj.message}`);
                }
                // Print the offending document(s)
                const errorIndices = Object.keys(err.errors).map(k => k.split('.')[0]).filter(idx => !isNaN(idx));
                if (errorIndices.length > 0) {
                    console.error('Offending documents details:');
                    for (const idx of new Set(errorIndices)) {
                        console.error(`  Doc #${idx}:`, JSON.stringify(docsToInsert[Number(idx)], null, 2));
                    }
                }
            }
            throw err;
        }
    }

    console.log(`[+] Finished "${sheetName}": ${successCount} imported, ${duplicateCount} duplicates skipped, ${errorCount} errors.`);
};

const runReimport = async () => {
    try {
        console.log('=== ERP Data Reimport Script ===');
        console.log(`Connecting to database...`);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected successfully to MongoDB.');

        // Find default admin user
        const defaultUser = await User.findOne({ role: 'admin' }) || await User.findOne();
        const createdBy = defaultUser ? defaultUser._id : null;
        console.log(`Admin User associated with imports: ${defaultUser ? defaultUser.email : 'None (No user found)'}`);

        // 1. Campus Visit
        await cleanAndImport('Campus Visit', CampusVisit, {
            'Date': 'date',
            'Type': 'type',
            'Visitor\'s Name & Details': 'visitorName',
            'University Name': 'universityName',
            'Country': 'country',
            'Department': 'department',
            'Summary': 'summary',
            'Campus': 'campus'
        }, ['date', 'visitorName', 'universityName'], createdBy);

        // 2. MoU Signing Ceremony
        await cleanAndImport('MoU Signing Ceremony', MouSigningCeremony, {
            'Date': 'date',
            'Type': 'type',
            'Visitor\'s Name & Details': 'visitorName',
            'University Name': 'university',
            'Department': 'department',
            'Event Summary': 'eventSummary',
            'Campus': 'campus'
        }, ['date', 'university'], createdBy);

        // 3. Events
        await cleanAndImport('Events', Event, {
            'Date': 'date',
            'Type': 'type',
            'Name & Details': 'title',
            'Department': 'department',
            'University, Country': 'universityCountry',
            'Dignitaries': 'dignitaries',
            'Event Summary': 'eventSummary',
            'Campus': 'campus'
        }, ['date', 'title'], createdBy);

        // 4. Conference
        await cleanAndImport('Conference', Conference, {
            'Date': 'date',
            'Conference Name': 'conferenceName',
            'Country': 'country',
            'Department': 'department',
            'Event Summary': 'eventSummary',
            'Campus': 'campus'
        }, ['date', 'conferenceName'], createdBy);

        // 5. Scholars in Residence
        await cleanAndImport('Scholars in Residence', ScholarInResidence, {
            'Scholar Name': 'scholarName',
            'Designation': 'designation',
            'University': 'university',
            'Country': 'country',
            'QS Ranking': 'qsRanking',
            'Duration / Days': 'durationDays',
            'Start Date': 'startDate',
            'End Date': 'endDate',
            'Schools / Department': 'department',
            'Accommodation / Campus': 'campus',
            'Status': 'scholarStatus', // Map excel Status -> scholarStatus in model
            'Email': 'email',
            'Mobile': 'mobile',
            'Remarks / Summary': 'summary',
            'Drive Link': 'driveLink',
            'Notes': 'notes'
        }, ['scholarName', 'startDate'], createdBy);

        // 6. MoU Update
        await cleanAndImport('MoU Update', MouUpdate, {
            'Date': 'date',
            'Country': 'country',
            'University': 'university',
            'Department': 'department',
            'Completed Date': 'completedDate', // maps to the new completedDate field!
            'MoU Status': 'mouStatus',
            'Contact Person': 'contactPerson',
            'Contact Email': 'contactEmail',
            'Agreement Type': 'agreementType',
            'Term': 'term',
            'Validity Status': 'validityStatus'
        }, ['university', 'agreementType', 'date'], createdBy);

        // 7. Immersion program
        await cleanAndImport('Immersion program', ImmersionProgram, {
            'Status': 'programStatus',
            'Incoming/Outgoing': 'direction',
            'Country': 'country',
            'University': 'university',
            'No of Pax': 'numberOfPax',
            'Summary': 'summary',
            'Arrival Date': 'arrivalDate',
            'Departure Date': 'departureDate',
            'Fees Per Pax': 'feesPerPax',
            'Department': 'department',
            'Notes': 'notes'
        }, ['university', 'arrivalDate', 'direction'], createdBy);

        // 8. Student Exchange
        await cleanAndImport('Student Exchange', StudentExchange, {
            'Incoming / Outgoing': 'direction',
            'Students Name': 'studentName',
            'Course': 'course',
            'Semester /Year': 'semesterYear',
            'USN NO': 'usnNo',
            'Exchange University': 'exchangeUniversity',
            'From Date': 'fromDate',
            'To Date': 'toDate',
            'Status': 'exchangeStatus', // Maps to exchangeStatus in model, leaving system workflow status as default 'active'
            'Notes': 'notes'
        }, ['studentName', 'exchangeUniversity'], createdBy);

        // 9. Masters Abroad
        await cleanAndImport('Masters Abroad', MastersAbroad, {
            'Students Name': 'studentName',
            'Country': 'country',
            'University': 'university',
            'Course Studying': 'courseStudying',
            'Course Tenure': 'courseTenure',
            'Passport Number': 'passportNumber', // new passportNumber field!
            'USN Number': 'usnNumber',
            'CGPA': 'cgpa',
            'School of Study (UG at DSU)': 'schoolOfStudy'
        }, ['studentName', 'university'], createdBy);

        // 10. Memberships
        await cleanAndImport('Memberships', Membership, {
            'Date': 'date',
            'Status': 'membershipStatus',
            'Name': 'name',
            'Summary': 'summary',
            'Country': 'country',
            'Membership Duration': 'membershipDuration',
            'Start Date': 'startDate',
            'End Date': 'endDate'
        }, ['name', 'startDate'], createdBy);

        // 11. Digital Media
        await cleanAndImport('Digital Media', DigitalMedia, {
            'Date': 'date',
            'Channel': 'channel',
            'Link of the Article': 'articleLink', // maps to schema's articleLink!
            'Article Topic': 'articleTopic',
            'Amount Paid': 'amountPaid',
            'Summary': 'summary'
        }, ['date', 'articleLink'], createdBy);

        // 12. Meeting Trackers (Custom from a different workbook)
        console.log('\n[*] Processing Meeting Trackers workbook...');
        const MEETING_EXCEL_PATH = path.join(__dirname, '..', '..', 'Meeting Trackers .xlsx');
        const meetingWorkbook = XLSX.readFile(MEETING_EXCEL_PATH);
        
        // Clear MeetingTracker collection
        const meetingDeleteRes = await MeetingTracker.deleteMany({});
        console.log(`[-] Cleared ${meetingDeleteRes.deletedCount} existing records from MeetingTracker collection.`);

        const meetingDocs = [];
        let meetingTotalProcessed = 0;
        let meetingDuplicateCount = 0;

        for (const name of meetingWorkbook.SheetNames) {
            const sheet = meetingWorkbook.Sheets[name];
            const rawRows = XLSX.utils.sheet_to_json(sheet);
            console.log(`[*] Reading ${rawRows.length} rows from sheet "${name}"...`);

            const seenMeetingKeys = new Set();

            for (const rawRow of rawRows) {
                const row = normalizeRow(rawRow);
                meetingTotalProcessed++;

                if (!row['Meeting ID'] && !row['Meeting Title'] && !row['Sl NO']) {
                    continue; // Skip empty row
                }

                const dateParsed = excelDateToJSDate(row['Date'] || row['Meeting Date']);
                const nextMeetingDateParsed = excelDateToJSDate(row['Next Meeting Date']);
                const startTimeParsed = parseExcelTime(row['Start Time']);
                const endTimeParsed = parseExcelTime(row['End Time']);

                const doc = {
                    meetingId: String(row['Meeting ID'] || row['ID'] || '').trim(),
                    meetingTitle: String(row['Meeting Title'] || row['Title'] || '').trim() || 'Untitled Meeting',
                    date: dateParsed,
                    startTime: startTimeParsed,
                    endTime: endTimeParsed,
                    timezone: String(row['Timezone'] || row['Time Zone'] || 'IST').trim(),
                    mode: String(row['Mode (Online/Offline)'] || row['Mode'] || 'Online').trim(),
                    platformLocation: String(row['Platform/Location'] || '').trim(),
                    hostOrganization: String(row['Host Organization'] || '').trim(),
                    hostName: String(row['Host Name'] || '').trim(),
                    hostEmail: String(row['Host Email'] || '').trim(),
                    participants: String(row['Participants'] || '').trim(),
                    keyAgenda: String(row['Key Agenda'] || '').trim(),
                    discussionSummary: String(row['Discussion Summary'] || '').trim(),
                    actionItems: String(row['Action Items'] || '').trim(),
                    nextMeetingDate: nextMeetingDateParsed,
                    driveLink: String(row['Drive Link (MoM/Recording)'] || row['Drive Link'] || row['drive link'] || '').trim(),
                    remarks: String(row['Remarks'] || '').trim(),
                    sheetMonth: name,
                    status: 'active',
                    createdBy: createdBy,
                    updatedBy: createdBy
                };

                // Deduplicate within the same sheet
                const uniqueVal = `${doc.meetingTitle}|${doc.date ? doc.date.getTime() : ''}`;
                if (seenMeetingKeys.has(uniqueVal)) {
                    meetingDuplicateCount++;
                    continue;
                }
                seenMeetingKeys.add(uniqueVal);

                meetingDocs.push(doc);
            }
        }

        if (meetingDocs.length > 0) {
            const insertedMeetings = await MeetingTracker.insertMany(meetingDocs, { ordered: false });
            console.log(`[+] Finished Meeting Trackers: ${insertedMeetings.length} imported, ${meetingDuplicateCount} duplicates skipped.`);
        } else {
            console.log(`[!] No Meeting Tracker records to import.`);
        }

        console.log('\n=== Database Reimport Completed Successfully! ===');
        process.exit(0);
    } catch (error) {
        console.error('\n[Fatal Error] Reimport process failed:', error);
        process.exit(1);
    }
};

runReimport();
