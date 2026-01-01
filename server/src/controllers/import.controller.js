import ExcelJS from 'xlsx';
import Partner from '../models/Partner.js';
import CampusVisit from '../models/CampusVisit.js';
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

// Helper to parse date from Excel (which might be number or string)
const parseDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
        // Excel date serial number
        return new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    return new Date(value);
};

export const importData = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const workbook = ExcelJS.read(req.file.buffer, { type: 'buffer' });
        const moduleName = req.params.module;
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
                Model = CampusVisit;
                mappingFunction = (row) => ({
                    date: parseDate(row['Date']),
                    visitType: row['Type'],
                    visitorName: row['Visitor\'s Name & Details'],
                    country: row['Country'],
                    universityName: row['University Name'],
                    summary: row['Summary'],
                    department: row['Department'],
                    campus: row['Campus'],
                    driveLink: row['drive link']
                });
                break;
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
                    status: row['Status'], // Careful with mapped values
                    category: row['Category'],
                    scholarName: row['Scholars NAme'],
                    university: row['University'],
                    country: row['Country'],
                    fromDate: parseDate(row['FRom Date']),
                    toDate: parseDate(row['To Date']),
                    department: row['Department'],
                    summary: row['Summary'],
                    campus: row['Campus(Kudlu,Harohalli)'],
                    driveLink: row['drive link']
                });
                break;
            case 'mou-updates':
                Model = MouUpdate;
                mappingFunction = (row) => ({
                    date: parseDate(row['Date']),
                    country: row['Country'],
                    university: row['University'],
                    department: row['Departmnet'],
                    completedDate: parseDate(row['Completed Date']), // Schema check needed
                    mouStatus: row['MoU Status'],
                    contactPerson: row['Contact Person'],
                    contactEmail: row['Contact Email'],
                    agreementType: row['Agreement Type'],
                    term: row['Term'],
                    validityStatus: row['Validity Status'],
                    driveLink: row['drive link']
                });
                break;
            case 'immersion-programs':
                Model = ImmersionProgram;
                mappingFunction = (row) => ({
                    programStatus: row['Status'],
                    direction: row['Incoming/Outgoing'],
                    country: row['Country'],
                    university: row['University'],
                    numberOfPax: row['No of Day'], // Check if this maps to Pax or Duration
                    summary: row['Summary'],
                    arrivalDate: parseDate(row['Arrival Date']),
                    departureDate: parseDate(row['Departure Date']),
                    fees: row['Fees Per Day'],
                    department: row['Department'],
                    driveLink: row['drive link']
                });
                break;
            case 'student-exchange':
                Model = StudentExchange;
                mappingFunction = (row) => ({
                    direction: row['Incoming/Outgoing'],
                    studentName: row['Students Name'],
                    semesterYear: row['Course Semester Year'],
                    usnNumber: row['USN No'], // mapped?
                    exchangeUniversity: row['Exchange University'],
                    fromDate: parseDate(row['From Date']),
                    toDate: parseDate(row['To Date']),
                    exchangeStatus: row['Status'],
                    driveLink: row['drive link']
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
                    type: row['Channel'], // Mapping Channel to Type
                    link: row['Link of Article'],
                    title: row['Article Topic'],
                    // amountPaid: row['Amoun t Paid'], // Schema check 
                    reach: row['Summary'], // Mapping Summary to Reach? or maybe Summary is separate
                    driveLink: row['drive link']
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
