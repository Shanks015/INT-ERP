import PDFDocument from 'pdfkit-table';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel } from 'docx';
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

const getModel = (moduleName) => {
    switch (moduleName) {
        case 'partners': return Partner;
        case 'campus-visits': return CampusVisit;
        case 'events': return Event;
        case 'conferences': return Conference;
        case 'mou-signing-ceremonies': return MouSigningCeremony;
        case 'scholars-in-residence': return Scholar;
        case 'mou-updates': return MouUpdate;
        case 'immersion-programs': return ImmersionProgram;
        case 'student-exchange': return StudentExchange;
        case 'masters-abroad': return MastersAbroad;
        case 'memberships': return Membership;
        case 'digital-media': return DigitalMedia;
        default: return null;
    }
};

const getDisplayFields = (moduleName) => {
    // Define columns for PDF/DOCX tables
    switch (moduleName) {
        case 'partners': return ['partnerName', 'country', 'university', 'status'];
        case 'campus-visits': return ['date', 'visitorName', 'universityName', 'campus'];
        case 'events': return ['date', 'name', 'type', 'campus'];
        case 'conferences': return ['date', 'conferenceName', 'country', 'campus'];
        case 'all': return ['module', 'date', 'title', 'details']; // Generic for combined
        default: return ['_id'];
    }
};

const fetchData = async (module, filters) => {
    const query = {};

    // Date range filtering
    if (filters.startDate && filters.endDate) {
        // Determine date field name (mostly 'date', but sometimes 'arrivalDate', 'fromDate' etc)
        const dateField = ['scholars-in-residence', 'student-exchange'].includes(module) ? 'fromDate' :
            ['immersion-programs'].includes(module) ? 'arrivalDate' : 'date';
        query[dateField] = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
    }

    // Status filtering
    if (filters.status && filters.status !== 'all') {
        query.status = filters.status;
    }

    // Module-specific filters
    if (filters.country && filters.country.trim()) {
        query.country = { $regex: filters.country, $options: 'i' }; // Case-insensitive search
    }
    if (filters.department && filters.department.trim()) {
        query.department = { $regex: filters.department, $options: 'i' };
    }
    if (filters.type && filters.type.trim()) {
        query.type = filters.type;
    }
    if (filters.category && filters.category.trim()) {
        query.category = filters.category;
    }
    if (filters.direction && filters.direction.trim()) {
        query.direction = filters.direction;
    }
    if (filters.campus && filters.campus.trim()) {
        query.campus = filters.campus;
    }
    if (filters.channel && filters.channel.trim()) {
        query.channel = filters.channel;
    }
    if (filters.agreementType && filters.agreementType.trim()) {
        query.agreementType = filters.agreementType;
    }
    if (filters.membershipStatus && filters.membershipStatus.trim()) {
        query.membershipStatus = filters.membershipStatus;
    }
    if (filters.partnershipType && filters.partnershipType.trim()) {
        query.partnershipType = filters.partnershipType;
    }

    const Model = getModel(module);
    if (!Model) return [];

    const data = await Model.find(query).lean();
    return data.map(item => ({ ...item, module }));
};

export const generateReport = async (req, res) => {
    try {
        const filters = req.body; // Get all filters from request body
        const { format, modules } = filters;

        const modulesToFetch = modules === 'all'
            ? ['partners', 'campus-visits', 'events', 'conferences', 'mou-signing-ceremonies', 'scholars-in-residence', 'mou-updates', 'immersion-programs', 'student-exchange', 'masters-abroad', 'memberships', 'digital-media', 'outreach']
            : [modules]; // Single module as array

        let allData = [];
        for (const mod of modulesToFetch) {
            const data = await fetchData(mod, filters);
            allData = [...allData, ...data];
        }

        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.pdf`);
            doc.pipe(res);

            // Header
            doc.fontSize(20).text('International Affairs Report', { align: 'center' });
            doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
            doc.moveDown();

            // Table Data Preparation
            const tableData = {
                headers: ['Module', 'Date', 'Name/Title', 'Details', 'Status'],
                rows: allData.map(item => [
                    item.module,
                    item.date ? new Date(item.date).toLocaleDateString() : (item.fromDate ? new Date(item.fromDate).toLocaleDateString() : '-'),
                    item.partnerName || item.visitorName || item.name || item.conferenceName || item.studentName || item.title || 'N/A',
                    item.university || item.universityName || item.country || item.department || '-',
                    item.status
                ])
            };

            await doc.table(tableData, {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
                prepareRow: () => doc.font("Helvetica").fontSize(10)
            });

            doc.end();

        } else if (format === 'docx') {
            const tableRows = allData.map(item =>
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(item.module)] }),
                        new TableCell({ children: [new Paragraph(item.date ? new Date(item.date).toLocaleDateString() : '-')] }),
                        new TableCell({ children: [new Paragraph(item.partnerName || item.visitorName || item.name || item.title || 'N/A')] }),
                        new TableCell({ children: [new Paragraph(item.university || item.country || '-')] }),
                        new TableCell({ children: [new Paragraph(item.status || '-')] }),
                    ],
                })
            );

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({ text: "International Affairs Report", heading: HeadingLevel.HEADING_1 }),
                        new Paragraph({ text: `Generated on: ${new Date().toLocaleDateString()}` }),
                        new Paragraph({ text: "" }), // Spacer
                        new Table({
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ text: "Module", bold: true })] }),
                                        new TableCell({ children: [new Paragraph({ text: "Date", bold: true })] }),
                                        new TableCell({ children: [new Paragraph({ text: "Name/Title", bold: true })] }),
                                        new TableCell({ children: [new Paragraph({ text: "Details", bold: true })] }),
                                        new TableCell({ children: [new Paragraph({ text: "Status", bold: true })] }),
                                    ],
                                }),
                                ...tableRows
                            ],
                            width: { size: 100, type: WidthType.PERCENTAGE }
                        }),
                    ],
                }],
            });

            const buffer = await Packer.toBuffer(doc);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.docx`);
            res.send(buffer);
        } else {
            res.status(400).json({ message: 'Invalid format' });
        }

    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ message: 'Error generating report' });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        const [
            partnersCount,
            eventsRes,
            scholarsRes,
            conferencesRes,
            visitsRes
        ] = await Promise.all([
            Partner.countDocuments(),
            Event.aggregate([
                { $group: { _id: "$type", count: { $sum: 1 } } }
            ]),
            Scholar.aggregate([
                { $group: { _id: "$country", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]),
            Conference.countDocuments(),
            CampusVisit.aggregate([
                { $group: { _id: { $month: "$date" }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ])
        ]);

        // Process aggregations
        const eventTypes = eventsRes.map(e => ({ name: e._id || 'Unspecified', value: e.count }));
        const scholarCountries = scholarsRes.map(s => ({ name: s._id || 'Unknown', value: s.count }));

        // Month map
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const visitsByMonth = visitsRes.map(v => ({
            name: months[v._id - 1],
            visits: v.count
        }));

        res.json({
            success: true,
            stats: {
                counts: {
                    partners: partnersCount,
                    conferences: conferencesRes,
                    events: eventsRes.reduce((acc, curr) => acc + curr.count, 0),
                    scholars: scholarsRes.reduce((acc, curr) => acc + curr.count, 0)
                },
                charts: {
                    eventTypes,
                    scholarCountries,
                    visitsByMonth
                }
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Error fetching dashboard stats' });
    }
};
