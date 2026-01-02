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

export const handleFormSubmit = async (req, res) => {
    try {
        const { formTitle, responses, timestamp } = req.body;

        if (!responses || !Array.isArray(responses)) {
            return res.status(400).json({ success: false, message: 'Invalid payload: responses array missing' });
        }

        console.log(`Received submission for form: ${formTitle}`);
        let result;

        // Normalize form title to lowercase for matching
        const normalizedTitle = formTitle ? formTitle.toLowerCase() : '';

        // Helper to find answer by question text (partial match)
        const getAnswer = (keyword) => {
            const entry = responses.find(r => r.question.toLowerCase().includes(keyword.toLowerCase()));
            return entry ? entry.answer : null;
        };

        // Date helper
        const parseDate = (dateStr) => {
            return dateStr ? new Date(dateStr) : new Date();
        };

        if (normalizedTitle.includes('campus visit')) {
            result = await CampusVisit.create({
                universityName: getAnswer('University') || 'Unknown University',
                country: getAnswer('Country') || 'Unknown',
                visitorName: getAnswer('Visitor') || 'Unknown Visitor',
                date: parseDate(getAnswer('Date')),
                type: getAnswer('Type') || 'Delegation',
                department: getAnswer('Department'),
                campus: getAnswer('Campus'),
                summary: getAnswer('Summary') || getAnswer('Purpose'),
                driveLink: getAnswer('Drive Document') || getAnswer('Link')
            });
        }
        else if (normalizedTitle.includes('event')) {
            result = await Event.create({
                title: getAnswer('Title') || 'Untitled Event',
                type: getAnswer('Type') || 'Guest Lecture',
                universityCountry: getAnswer('University') || getAnswer('Country'),
                date: parseDate(getAnswer('Date')),
                department: getAnswer('Department'),
                campus: getAnswer('Campus'),
                webLink: getAnswer('Web Link'),
                eventSummary: getAnswer('Summary'),
                driveLink: getAnswer('Drive Document')
            });
        }
        else if (normalizedTitle.includes('conference')) {
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
        else if (normalizedTitle.includes('scholar')) {
            result = await ScholarInResidence.create({
                scholarName: getAnswer('Scholar') || getAnswer('Name'),
                institution: getAnswer('Institution'),
                country: getAnswer('Country'),
                residencePeriod: getAnswer('Period') || getAnswer('Duration'),
                university: getAnswer('University'),
                category: getAnswer('Category'),
                summary: getAnswer('Summary'),
                campus: getAnswer('Campus'),
                driveLink: getAnswer('Drive Document')
            });
        }
        else if (normalizedTitle.includes('mou update')) {
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
                driveLink: getAnswer('Drive Document')
            });
        }
        else if (normalizedTitle.includes('mou signing')) {
            const partnerName = getAnswer('University') || getAnswer('Partner');
            result = await MouSigningCeremony.create({
                university: partnerName,
                country: getAnswer('Country') || 'Unknown',
                date: parseDate(getAnswer('Date')),
                department: getAnswer('Department'),
                location: getAnswer('Location'),
                title: getAnswer('Title') || `MoU Signing with ${partnerName}`,
                driveLink: getAnswer('Drive Document')
            });
        }
        else if (normalizedTitle.includes('immersion')) {
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
        else if (normalizedTitle.includes('student exchange')) {
            result = await StudentExchange.create({
                studentName: getAnswer('Student'),
                exchangeUniversity: getAnswer('University'),
                country: getAnswer('Country'),
                duration: getAnswer('Duration'),
                startDate: parseDate(getAnswer('Start Date')),
                endDate: parseDate(getAnswer('End Date')),
                usnNo: getAnswer('USN'),
                driveLink: getAnswer('Drive Document')
            });
        }
        else if (normalizedTitle.includes('masters abroad')) {
            result = await MastersAbroad.create({
                university: getAnswer('University'),
                country: getAnswer('Country'),
                duration: getAnswer('Duration')
            });
        }
        else if (normalizedTitle.includes('digital media')) {
            result = await DigitalMedia.create({
                articleTopic: getAnswer('Topic') || getAnswer('Article'),
                channel: getAnswer('Channel'),
                date: parseDate(getAnswer('Date')),
                amountPaid: parseFloat(getAnswer('Amount') || '0'),
                articleLink: getAnswer('Link'),
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
