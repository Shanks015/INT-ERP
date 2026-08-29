import CampusVisit from '../models/CampusVisit.js';
import Event from '../models/Event.js';
import Conference from '../models/Conference.js';
import ScholarInResidence from '../models/ScholarInResidence.js';
import MouUpdate from '../models/MouUpdate.js';
import MouSigningCeremony from '../models/MouSigningCeremony.js';
import ImmersionProgram from '../models/ImmersionProgram.js';
import StudentExchange from '../models/StudentExchange.js';
import MastersAbroad from '../models/MastersAbroad.js';
import DigitalMedia from '../models/DigitalMedia.js';
import { resolveFormModule, buildAnswerLookup, parseFormDate } from '../utils/formRouting.js';

export const handleFormSubmit = async (req, res) => {
    try {
        const { formTitle, responses, timestamp } = req.body;

        if (!responses || !Array.isArray(responses)) {
            return res.status(400).json({ success: false, message: 'Invalid payload: responses array missing' });
        }

        // Routing rules live in utils/formRouting.js so their ordering is unit-tested.
        // Module ids here match the FORM_ROUTES table exactly.
        const targetModule = resolveFormModule(formTitle);

        // Helper to find answer by question text (partial match)
        const getAnswer = buildAnswerLookup(responses);

        // Date helper
        const parseDate = parseFormDate;

        let result;

        if (targetModule === 'campus-visits') {
            result = await CampusVisit.create({
                universityName: getAnswer('University') || 'Unknown University',
                country: getAnswer('Country') || 'Unknown',
                visitorName: getAnswer('Visitor') || 'Unknown Visitor',
                date: parseDate(getAnswer('Date')),
                type: getAnswer('Type') || 'Delegation',
                department: getAnswer('Department'),
                campus: getAnswer('Campus'),
                summary: getAnswer('Summary') || getAnswer('Purpose'),
                purpose: getAnswer('Purpose'),
                driveLink: getAnswer('Drive Document') || getAnswer('Link')
            });
        }
        else if (targetModule === 'mou-signing-ceremonies') {
            const partnerName = getAnswer('University') || getAnswer('Partner');
            result = await MouSigningCeremony.create({
                university: partnerName,
                date: parseDate(getAnswer('Date')),
                type: getAnswer('Type'),
                visitorName: getAnswer('Visitor') || getAnswer('Dignitary'),
                department: getAnswer('Department'),
                campus: getAnswer('Campus'),
                eventSummary: getAnswer('Summary') || `MoU Signing with ${partnerName}`,
                driveLink: getAnswer('Drive Document')
            });
        }
        else if (targetModule === 'mou-updates') {
            result = await MouUpdate.create({
                university: getAnswer('University'),
                country: getAnswer('Country'),
                date: parseDate(getAnswer('Date')),
                department: getAnswer('Department'),
                contactPerson: getAnswer('Contact Person'),
                contactEmail: getAnswer('Email'),
                mouStatus: getAnswer('Status') || 'Active',
                agreementType: getAnswer('Agreement Type') || 'MoU',
                term: getAnswer('Term'),
                validityStatus: getAnswer('Validity'),
                driveLink: getAnswer('Drive Document')
            });
        }
        else if (targetModule === 'events') {
            result = await Event.create({
                title: getAnswer('Title') || 'Untitled Event',
                type: getAnswer('Type') || 'Guest Lecture',
                universityCountry: getAnswer('University') || getAnswer('Country'),
                date: parseDate(getAnswer('Date')),
                department: getAnswer('Department'),
                campus: getAnswer('Campus'),
                dignitaries: getAnswer('Dignitaries'),
                eventSummary: getAnswer('Summary'),
                driveLink: getAnswer('Drive Document') || getAnswer('Web Link')
            });
        }
        else if (targetModule === 'conferences') {
            result = await Conference.create({
                conferenceName: getAnswer('Conference') || 'Untitled Conference',
                country: getAnswer('Country'),
                date: parseDate(getAnswer('Date')),
                department: getAnswer('Department'),
                campus: getAnswer('Campus'),
                eventSummary: getAnswer('Summary'),
                driveLink: getAnswer('Drive Document')
            });
        }
        else if (targetModule === 'scholars-in-residence') {
            result = await ScholarInResidence.create({
                scholarName: getAnswer('Scholar') || getAnswer('Name'),
                university: getAnswer('University') || getAnswer('Institution'),
                country: getAnswer('Country'),
                category: getAnswer('Category'),
                department: getAnswer('Department'),
                fromDate: getAnswer('From') ? parseDate(getAnswer('From')) : undefined,
                toDate: getAnswer('To') ? parseDate(getAnswer('To')) : undefined,
                summary: getAnswer('Summary'),
                campus: getAnswer('Campus'),
                driveLink: getAnswer('Drive Document')
            });
        }
        else if (targetModule === 'immersion-programs') {
            result = await ImmersionProgram.create({
                university: getAnswer('University'),
                country: getAnswer('Country'),
                direction: getAnswer('Direction') || 'Incoming',
                numberOfPax: parseInt(getAnswer('Participants') || '0'),
                programStatus: getAnswer('Status') || 'Planned',
                arrivalDate: parseDate(getAnswer('Arrival')),
                departureDate: parseDate(getAnswer('Departure')),
                feesPerPax: getAnswer('Fees'),
                summary: getAnswer('Summary'),
                driveLink: getAnswer('Drive Document')
            });
        }
        else if (targetModule === 'student-exchange') {
            result = await StudentExchange.create({
                studentName: getAnswer('Student'),
                exchangeUniversity: getAnswer('University'),
                country: getAnswer('Country'),
                course: getAnswer('Course'),
                semesterYear: getAnswer('Semester'),
                direction: getAnswer('Direction'),
                fromDate: getAnswer('Start Date') ? parseDate(getAnswer('Start Date')) : undefined,
                toDate: getAnswer('End Date') ? parseDate(getAnswer('End Date')) : undefined,
                usnNo: getAnswer('USN'),
                driveLink: getAnswer('Drive Document')
            });
        }
        else if (targetModule === 'masters-abroad') {
            result = await MastersAbroad.create({
                studentName: getAnswer('Student') || getAnswer('Name'),
                university: getAnswer('University'),
                country: getAnswer('Country'),
                courseStudying: getAnswer('Course'),
                courseTenure: getAnswer('Duration') || getAnswer('Tenure'),
                usnNumber: getAnswer('USN'),
                schoolOfStudy: getAnswer('School'),
                driveLink: getAnswer('Drive Document')
            });
        }
        else if (targetModule === 'digital-media') {
            result = await DigitalMedia.create({
                articleTopic: getAnswer('Topic') || getAnswer('Article'),
                channel: getAnswer('Channel'),
                date: parseDate(getAnswer('Date')),
                amountPaid: parseFloat(getAnswer('Amount') || '0'),
                articleLink: getAnswer('Link'),
                summary: getAnswer('Summary'),
                driveLink: getAnswer('Drive Document')
            });
        }
        else {
            console.warn(`Unknown form title: ${formTitle}`);
            return res.status(400).json({ success: false, message: 'Unknown form type' });
        }

        res.status(201).json({ success: true, message: 'Data imported successfully', data: result });
    } catch (error) {
        console.error('Error processing Google Form webhook:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
