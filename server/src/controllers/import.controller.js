import ExcelJS from 'xlsx';
import Partner from '../models/Partner.js';
import CampusVisit from '../models/CampusVisit.js';
import Seminar from '../models/Seminar.js';
import ConsultantVisit from '../models/ConsultantVisit.js';
import Event from '../models/Event.js';
import Conference from '../models/Conference.js';
import MouSigningCeremony from '../models/MouSigningCeremony.js';
import Scholar from '../models/ScholarInResidence.js';
import MouUpdate from '../models/MouUpdate.js';
import ImmersionProgram from '../models/ImmersionProgram.js';
import StudentExchange from '../models/StudentExchange.js';
import MastersAbroad from '../models/MastersAbroad.js';
import Membership from '../models/Membership.js';
import DigitalMedia from '../models/DigitalMedia.js';
import MeetingTracker from '../models/MeetingTracker.js';
import SocialMedia from '../models/SocialMedia.js';

// Helper to parse date from Excel (which might be a serial number, ISO string,
// or the project's dd/MMM/yyyy text format, e.g. "02/Sep/2026")
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const parseDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
        // Excel date serial number
        return new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    const s = String(value).trim();
    // dd/MMM/yyyy (also tolerates "-", "." and month spelled out)
    let m = s.match(/^(\d{1,2})[/\-.\s]\s*([A-Za-z]{3,9})[/\-.\s]\s*(\d{2,4})$/);
    if (m) {
        const day = +m[1];
        const month = String(m[2]).slice(0, 3).toLowerCase();
        let year = +m[3];
        if (year < 100) year += 2000;
        if (MONTHS[month] !== undefined) {
            const d = new Date(Date.UTC(year, MONTHS[month], day));
            if (d.getUTCFullYear() === year && d.getUTCMonth() === MONTHS[month] && d.getUTCDate() === day) return d;
        }
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
};

// Helper to parse time from Excel (which might be decimal fraction of 24h or string)
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

// Pick the first present/non-empty value among accepted header spellings
const pick = (row, keys) => {
    for (const k of keys) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return undefined;
};
// Parse an optional positive number (handles commas, rejects "101-150" bands -> undefined)
const num = (v) => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(String(v).replace(/,/g, '').trim());
    return Number.isFinite(n) && n > 0 ? n : undefined;
};
// Parse an optional money amount that may be bare or carry a currency suffix
// (e.g. "2800", "2800 AUD", "₹25,000"). Strips the unit so a text cell can't
// fail Mongoose's Number cast; returns undefined when nothing numeric remains.
const money = (v) => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(String(v).replace(/[^0-9.]/g, '').trim());
    return Number.isFinite(n) ? n : undefined;
};
// Currency unit trailing an amount (e.g. "2800 AUD" -> "AUD", "550 GBP" -> "GBP").
// Falls back to any alphabetic token in the cell so codes in other positions
// (₹ handled separately) are still captured; undefined when only digits/₹.
const currency = (v) => {
    if (v === undefined || v === null || v === '') return undefined;
    const s = String(v).trim();
    const m = s.match(/[A-Za-z]{2,4}$/); // trailing code
    if (m) return m[0].toUpperCase();
    const any = s.match(/[A-Za-z]{2,4}/); // fallback: any alphabetic run
    return any ? any[0].toUpperCase() : undefined;
};

export const importData = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const workbook = ExcelJS.read(req.file.buffer, { type: 'buffer' });
        const moduleName = req.params.module;

        // Custom multi-tab import handling for meeting-trackers
        if (moduleName === 'meeting-trackers') {
            const allRecords = [];
            const errors = [];
            let totalProcessed = 0;

            for (const name of workbook.SheetNames) {
                const sheet = workbook.Sheets[name];
                const rawData = ExcelJS.utils.sheet_to_json(sheet);
                rawData.forEach((row, index) => {
                    totalProcessed++;
                    // Check if it's an empty row or has no key fields
                    if (!row['Meeting ID'] && !row['Meeting Title'] && !row['Sl NO']) {
                        errors.push({ row: index + 2, sheet: name, reason: 'Empty row or missing Sl NO/Meeting ID/Meeting Title' });
                        return;
                    }
                    
                    try {
                        const dateParsed = parseDate(row['Date'] || row['Meeting Date']);
                        const nextMeetingDateParsed = parseDate(row['Next Meeting Date']);
                        const startTimeParsed = parseExcelTime(row['Start Time']);
                        const endTimeParsed = parseExcelTime(row['End Time']);
                        
                        allRecords.push({
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
                            createdBy: req.user._id,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    } catch (err) {
                        errors.push({ row: index + 2, sheet: name, reason: err.message });
                    }
                });
            }
            
            if (allRecords.length === 0) {
                return res.status(400).json({ success: false, message: 'No valid data found in Meeting Tracker sheets', errors });
            }
            
            const result = await MeetingTracker.insertMany(allRecords);
            return res.json({
                success: true,
                message: `Successfully imported ${result.length} records into meeting-trackers across ${workbook.SheetNames.length} sheets`,
                summary: {
                    total: totalProcessed,
                    successful: result.length,
                    failed: totalProcessed - result.length
                },
                errors: errors.filter(e => !e.reason.includes('Empty row')) // Don't clutter user with empty row notifications
            });
        }

        let sheetName = workbook.SheetNames[0]; // Default to first sheet

        // Try to find a sheet that matches the module name if possible, otherwise use first
        // For this implementation we'll match generic names or use the user's specific mapping

        const sheet = workbook.Sheets[sheetName];
        const rawData = ExcelJS.utils.sheet_to_json(sheet);

        let Model;
        let mappingFunction;

        switch (moduleName) {
            case 'partners':
                Model = Partner;
                mappingFunction = (row) => ({
                    // Mapping for Partners - Assuming similar to schema or standard
                    partnerName: row['Partner Name'] || row['Name'],
                    country: row['Country'],
                    university: row['University'],
                    status: row['Status'] || 'Active',
                    // Add other fields as best guess or generic
                });
                break;
            case 'campus-visits':
            case 'seminars':
            case 'consultant-visits': {
                // The three campus modules share the same workbook shape/headers; only the
                // collection differs. Type values are authored per module (cleaned workbooks
                // carry 'University Visit' / 'Seminar' / 'Consultant Visit' respectively).
                Model = { 'campus-visits': CampusVisit, 'seminars': Seminar, 'consultant-visits': ConsultantVisit }[moduleName];
                mappingFunction = (row) => ({
                    date: parseDate(row['Date']),
                    type: row['Type'],
                    visitorName: row['Visitor\'s Name & Details'],
                    country: row['Country'],
                    universityName: row['University Name'],
                    summary: row['Summary'],
                    department: row['Department'],
                    campus: row['Campus'],
                    driveLink: pick(row, ['Campus Visit- Upload Zip FIle', 'drive link', 'Drive Link', 'Upload Zip File']),
                    notes: pick(row, ['Notes', 'Note'])
                });
                break;
            }
            case 'mou-signing-ceremonies':
                Model = MouSigningCeremony;
                mappingFunction = (row) => ({
                    date: parseDate(row['Date']),
                    type: row['Type'],
                    visitorName: row['Visitor\'s Name & Details'],
                    universityName: row['University Name'],
                    department: row['Department'],
                    eventSummary: row['Event Summary'],
                    campus: row['Campus(Kudlu,Harohalli)'],
                    driveLink: row['drive link']
                });
                break;
            case 'events':
                Model = Event;
                mappingFunction = (row) => ({
                    date: parseDate(row['Date']),
                    type: row['Type'],
                    name: row['Name & Details'],
                    department: row['Department'],
                    university: row['University with country'], // Might need split ifschema separates
                    dignitaries: row['Dignitaries'],
                    eventSummary: row['Event Summary'],
                    campus: row['Campus'],
                    driveLink: row['drive link']
                });
                break;
            case 'conferences':
                Model = Conference;
                mappingFunction = (row) => ({
                    date: parseDate(row['Date']),
                    conferenceName: row['Confernce Name'],
                    country: row['Country'],
                    department: row['Department'],
                    eventSummary: row['Event Summary'],
                    campus: row['Campus(Kudlu,Harohalli)'],
                    driveLink: row['drive link']
                });
                break;
            case 'scholars-in-residence':
                Model = Scholar;
                mappingFunction = (row) => ({
                    scholarName: String(pick(row, ['Scholar Name', 'Scholars Name', 'Scholars NAme', 'Scholar']) || '').trim(),
                    designation: String(pick(row, ['Designation', 'Category']) || '').trim(),
                    university: String(pick(row, ['University', 'Institution']) || '').trim(),
                    country: String(pick(row, ['Country']) || '').trim(),
                    qsRanking: num(pick(row, ['QS Ranking', 'QS Rank', 'Ranking'])),
                    durationDays: num(pick(row, ['Duration / Days', 'Duration/Days', 'Duration', 'No of Days', 'Days'])),
                    startDate: parseDate(pick(row, ['Start Date', 'From Date', 'FRom Date', 'Arrival Date'])),
                    endDate: parseDate(pick(row, ['End Date', 'To Date', 'Departure Date'])),
                    department: String(pick(row, ['Schools / Department', 'Schools/Department', 'Department']) || '').trim(),
                    campus: String(pick(row, ['Accommodation / Campus', 'Accommodation/Campus', 'Campus', 'Campus(Kudlu,Harohalli)']) || '').trim(),
                    scholarStatus: String(pick(row, ['Status']) || '').trim(),
                    email: String(pick(row, ['Email', 'Email Address', 'Contact Email']) || '').trim(),
                    mobile: String(pick(row, ['Mobile', 'Mobile Number', 'Phone', 'Contact Number']) || '').trim(),
                    summary: String(pick(row, ['Remarks / Summary', 'Remarks/Summary', 'Remarks', 'Summary']) || '').trim(),
                    driveLink: String(pick(row, ['Drive Link', 'drive link', 'Drive Document', 'Scholars in Residence - Upload Zip File', 'Upload']) || '').trim(),
                    notes: String(pick(row, ['Notes', 'Note']) || '').trim()
                });
                break;
            case 'mou-updates':
                Model = MouUpdate;
                mappingFunction = (row) => ({
                    date: parseDate(row['Date']),
                    country: row['Country'],
                    university: row['University'],
                    department: row['Department'],
                    completedDate: parseDate(row['Completed Date']), // Schema check needed
                    mouStatus: row['MoU Status'],
                    contactPerson: row['Contact Person'],
                    contactEmail: row['Contact Email'],
                    agreementType: row['Agreement Type'],
                    term: row['Term'],
                    validityStatus: row['Validity Status'],
                    driveLink: row['Drive Link']
                });
                break;
            case 'immersion-programs':
                Model = ImmersionProgram;
                mappingFunction = (row) => {
                    const fees = pick(row, ['Fees Per Pax', 'Fees']);
                    return {
                        programStatus: String(pick(row, ['Status', 'Program Status']) || '').trim(),
                        direction: String(pick(row, ['Incoming/Outgoing', 'Direction']) || '').trim(),
                        university: String(pick(row, ['University']) || '').trim(),
                        country: String(pick(row, ['Country']) || '').trim(),
                        numberOfPax: num(pick(row, ['No of Pax', 'No. of Pax', 'Number of Pax', 'No of Day'])) ?? 0,
                        department: String(pick(row, ['Department']) || '').trim(),
                        arrivalDate: parseDate(pick(row, ['Arrival Date'])),
                        departureDate: parseDate(pick(row, ['Departure Date'])),
                        summary: String(pick(row, ['Summary']) || '').trim(),
                        feesPerPax: money(fees),
                        feesCurrency: currency(fees),
                        driveLink: String(pick(row, ['Drive Link', 'drive link', 'Immersion Program -  Upload Zip FIle', 'Immersion Program - Upload Zip File', 'Upload']) || '').trim(),
                        notes: String(pick(row, ['Notes', 'Note']) || '').trim()
                    };
                };
                break;
            case 'student-exchange':
                Model = StudentExchange;
                mappingFunction = (row) => ({
                    direction: String(pick(row, ['Direction', 'Incoming/Outgoing', 'Incoming / Outgoing']) || '').trim(),
                    studentName: String(pick(row, ['Student Name', 'Students Name']) || '').trim(),
                    exchangeUniversity: String(pick(row, ['Exchange University']) || '').trim(),
                    country: String(pick(row, ['Country']) || '').trim(),
                    course: String(pick(row, ['Course']) || '').trim(),
                    semesterYear: String(pick(row, ['Semester / Year', 'Semester /Year', 'Semester/Year', 'Course Semester Year']) || '').trim(),
                    usnNo: String(pick(row, ['USN', 'USN NO', 'USN Number', 'USN No']) || '').trim(),
                    fromDate: parseDate(pick(row, ['From Date'])),
                    toDate: parseDate(pick(row, ['To Date'])),
                    exchangeStatus: String(pick(row, ['Status', 'Exchange Status']) || '').trim(),
                    driveLink: String(pick(row, ['Document Link', 'Drive Link', 'drive link', 'Student Exchange -  Upload Zip FIle', 'Student Exchange - Upload Zip File', 'Upload']) || '').trim(),
                    notes: String(pick(row, ['Notes', 'Note']) || '').trim()
                });
                break;
            case 'masters-abroad':
                Model = MastersAbroad;
                mappingFunction = (row) => ({
                    studentName: row['Studetns Name'],
                    country: row['Country'],
                    university: row['University'],
                    courseStudying: row['Course Studying'],
                    courseTenure: row['Course Tenure'],
                    passportNumber: row['Passport Number'],
                    usnNumber: row['USN Number'],
                    cgpa: row['CGPA'],
                    schoolOfStudy: row['School of Study(UG at DSU)'],
                    driveLink: row['drive link']
                });
                break;
            case 'memberships':
                Model = Membership;
                mappingFunction = (row) => ({
                    date: parseDate(row['Date']),
                    membershipStatus: row['Status'],
                    name: row['Name'],
                    summary: row['Summary'],
                    country: row['Country'],
                    membershipDuration: row['Membership Duration'],
                    startDate: parseDate(row['Start Date']),
                    endDate: parseDate(row['End Date']),
                    driveLink: row['drive link']
                });
                break;
            case 'digital-media':
                Model = DigitalMedia;
                mappingFunction = (row) => ({
                    date: parseDate(row['Date']),
                    channel: row['Channel'],
                    link: row['Link of the Article'] || row['Link of Article'],
                    articleTopic: row['Article Topic'],
                    amountPaid: row['Amount Paid'],
                    summary: row['Summary'],
                    driveLink: row['Digital Media -  Upload Zip FIle'] || row['drive link']
                });
                break;
            case 'social-media':
                Model = SocialMedia;
                mappingFunction = (row) => ({
                    postName: row['Post Name'] || row['Post'] || row['Name'],
                    caption: row['Caption'],
                    fbLink: row['Facebook'] || row['FB Link'] || row['Facebook Link'],
                    instaLink: row['Instagram'] || row['Insta Link'] || row['Instagram Link'],
                    linkedinLink: row['LinkedIn'] || row['Linkedin Link'] || row['LinkedIn Link'],
                    vkLink: row['VK'] || row['VK Link']
                });
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid module specified' });
        }

        const dataToInsert = rawData.map(row => {
            const mapped = mappingFunction(row);
            // Add audit fields
            return {
                ...mapped,
                status: 'active', // Default imported items to active
                createdBy: req.user._id, // Assuming auth middleware
                createdAt: new Date(),
                updatedAt: new Date()
            };
        });

        if (dataToInsert.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid data found in file' });
        }

        const result = await Model.insertMany(dataToInsert);

        res.json({
            success: true,
            message: `Successfully imported ${result.length} records into ${moduleName}`,
            count: result.length
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ success: false, message: 'Error processing import file', error: error.message });
    }
};
