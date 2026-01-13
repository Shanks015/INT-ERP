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
import Outreach from '../models/Outreach.js';

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
        case 'outreach': return Outreach;
        default: return null;
    }
};

const getDisplayFields = (moduleName) => {
    // Define columns for each module - returns { headers: [], extractor: (item) => [] }
    switch (moduleName) {
        case 'partners':
            return {
                headers: ['University', 'Country', 'School', 'MoU Status', 'Contact Person', 'Email', 'Phone', 'Agreement Type', 'Completed On', 'Department', 'Record Status'],
                extractor: (item) => [
                    item.university || '-',
                    item.country || '-',
                    item.school || '-',
                    item.mouStatus || '-',
                    item.contactPerson || '-',
                    item.email || '-',
                    item.phoneNumber || '-',
                    item.agreementType || '-',
                    item.completedOn ? new Date(item.completedOn).toLocaleDateString() : '-',
                    item.department || '-',
                    item.recordStatus || 'active'
                ]
            };
        case 'campus-visits':
            return {
                headers: ['Date', 'University', 'Country', 'Visitor Name', 'Type', 'Department', 'Campus'],
                extractor: (item) => [
                    item.date ? new Date(item.date).toLocaleDateString() : '-',
                    item.universityName || '-',
                    item.country || '-',
                    item.visitorName || '-',
                    item.type || '-',
                    item.department || '-',
                    item.campus || '-'
                ]
            };
        case 'events':
            return {
                headers: ['Date', 'Title', 'Type', 'Dignitaries', 'Department', 'Campus', 'University Country'],
                extractor: (item) => [
                    item.date ? new Date(item.date).toLocaleDateString() : '-',
                    item.title || '-',
                    item.type || '-',
                    item.dignitaries || '-',
                    item.department || '-',
                    item.campus || '-',
                    item.universityCountry || '-'
                ]
            };
        case 'conferences':
            return {
                headers: ['Date', 'Conference Name', 'Country', 'Department', 'Campus'],
                extractor: (item) => [
                    item.date ? new Date(item.date).toLocaleDateString() : '-',
                    item.conferenceName || '-',
                    item.country || '-',
                    item.department || '-',
                    item.campus || '-'
                ]
            };
        case 'mou-signing-ceremonies':
            return {
                headers: ['Date', 'Type', 'Visitor Name', 'University', 'Department', 'Event Summary', 'Campus', 'Drive Link'],
                extractor: (item) => [
                    item.date ? new Date(item.date).toLocaleDateString() : '-',
                    item.type || '-',
                    item.visitorName || '-',
                    item.university || '-',
                    item.department || '-',
                    item.eventSummary || '-',
                    item.campus || '-',
                    item.driveLink || '-'
                ]
            };
        case 'scholars-in-residence':
            return {
                headers: ['Scholar Name', 'University', 'Country', 'From Date', 'To Date', 'Category', 'Department', 'Campus', 'Record Status'],
                extractor: (item) => [
                    item.scholarName || '-',
                    item.university || '-',
                    item.country || '-',
                    item.fromDate ? new Date(item.fromDate).toLocaleDateString() : '-',
                    item.toDate ? new Date(item.toDate).toLocaleDateString() : '-',
                    item.category || '-',
                    item.department || '-',
                    item.campus || '-',
                    item.recordStatus || 'active'
                ]
            };
        case 'mou-updates':
            return {
                headers: ['Date', 'Country', 'University', 'Department', 'Contact Person', 'MoU Status', 'Contact Email', 'Agreement Type', 'Term', 'Validity Status', 'Drive Link'],
                extractor: (item) => [
                    item.date ? new Date(item.date).toLocaleDateString() : '-',
                    item.country || '-',
                    item.university || '-',
                    item.department || '-',
                    item.contactPerson || '-',
                    item.mouStatus || '-',
                    item.contactEmail || '-',
                    item.agreementType || '-',
                    item.term || '-',
                    item.validityStatus || '-',
                    item.driveLink || '-'
                ]
            };
        case 'immersion-programs':
            return {
                headers: ['Direction', 'University', 'Country', 'Arrival Date', 'Departure Date', 'Number of Pax', 'Department', 'Record Status'],
                extractor: (item) => [
                    item.direction || '-',
                    item.university || '-',
                    item.country || '-',
                    item.arrivalDate ? new Date(item.arrivalDate).toLocaleDateString() : '-',
                    item.departureDate ? new Date(item.departureDate).toLocaleDateString() : '-',
                    item.numberOfPax || '-',
                    item.department || '-',
                    item.recordStatus || 'active'
                ]
            };
        case 'student-exchange':
            return {
                headers: ['Direction', 'Student Name', 'University', 'Country', 'From Date', 'To Date', 'Department', 'Program Name', 'Record Status'],
                extractor: (item) => [
                    item.direction || '-',
                    item.studentName || '-',
                    item.university || '-',
                    item.country || '-',
                    item.fromDate ? new Date(item.fromDate).toLocaleDateString() : '-',
                    item.toDate ? new Date(item.toDate).toLocaleDateString() : '-',
                    item.department || '-',
                    item.programName || '-',
                    item.recordStatus || 'active'
                ]
            };
        case 'masters-abroad':
            return {
                headers: ['Student Name', 'University', 'Country', 'Course', 'Tenure', 'USN', 'CGPA', 'School'],
                extractor: (item) => [
                    item.studentName || '-',
                    item.university || '-',
                    item.country || '-',
                    item.courseStudying || '-',
                    item.courseTenure || '-',
                    item.usnNumber || '-',
                    item.cgpa || '-',
                    item.schoolOfStudy || '-'
                ]
            };
        case 'memberships':
            return {
                headers: ['Name', 'Country', 'Membership Status', 'Start Date', 'End Date', 'Record Status'],
                extractor: (item) => [
                    item.name || '-',
                    item.country || '-',
                    item.membershipStatus || '-',
                    item.startDate ? new Date(item.startDate).toLocaleDateString() : '-',
                    item.endDate ? new Date(item.endDate).toLocaleDateString() : '-',
                    item.recordStatus || 'active'
                ]
            };
        case 'digital-media':
            return {
                headers: ['Date', 'Article Topic', 'Channel', 'Amount Paid'],
                extractor: (item) => [
                    item.date ? new Date(item.date).toLocaleDateString() : '-',
                    item.articleTopic || '-',
                    item.channel || '-',
                    item.amountPaid || 'Zero'
                ]
            };
        case 'outreach':
            return {
                headers: ['Program Name', 'Country', 'Partnership Type', 'Department'],
                extractor: (item) => [
                    item.programName || item.name || '-',
                    item.country || '-',
                    item.partnershipType || '-',
                    item.department || '-'
                ]
            };
        default:
            return {
                headers: ['Module', 'Date', 'Name', 'Details'],
                extractor: (item) => [
                    item.module || '-',
                    item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-',
                    item.name || item.title || '-',
                    item.country || item.department || '-'
                ]
            };
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

    // Status filtering - only filter if a specific status is selected
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
            const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.pdf`);
            doc.pipe(res);

            // Header
            doc.fontSize(16).text('International Affairs Report', { align: 'center' });
            doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
            doc.fontSize(9).text(`Module: ${modules === 'all' ? 'All Modules' : modules}`, { align: 'center' });
            doc.moveDown(0.5);

            // Table configuration to prevent empty spaces
            const tableConfig = {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(7),
                prepareRow: () => doc.font("Helvetica").fontSize(7),
                width: 800,
                padding: 2, // Minimal padding
                minHeight: 15, // Small row height
                hideLines: false
            };

            if (modules === 'all') {
                const moduleGroups = {};
                allData.forEach(item => {
                    if (!moduleGroups[item.module]) moduleGroups[item.module] = [];
                    moduleGroups[item.module].push(item);
                });

                for (const [moduleName, moduleData] of Object.entries(moduleGroups)) {
                    // Check if we need a new page
                    if (doc.y > 700) doc.addPage();

                    doc.fontSize(12).text(`${moduleName.toUpperCase()}`, { underline: true });
                    doc.moveDown(0.3);

                    const fieldConfig = getDisplayFields(moduleName);

                    // Calculate column widths
                    const columnWidth = 800 / fieldConfig.headers.length;
                    const columnsSize = fieldConfig.headers.map(() => columnWidth);

                    const tableData = {
                        headers: fieldConfig.headers,
                        rows: moduleData.map(item => fieldConfig.extractor(item))
                    };

                    await doc.table(tableData, {
                        ...tableConfig,
                        columnsSize
                    });

                    doc.moveDown(0.3);
                }
            } else {
                const fieldConfig = getDisplayFields(modules);
                const columnWidth = 800 / fieldConfig.headers.length;
                const columnsSize = fieldConfig.headers.map(() => columnWidth);

                const tableData = {
                    headers: fieldConfig.headers,
                    rows: allData.map(item => fieldConfig.extractor(item))
                };

                await doc.table(tableData, {
                    ...tableConfig,
                    columnsSize
                });
            }

            doc.end();

        } else if (format === 'docx') {
            let allTableRows = [];

            if (modules === 'all') {
                // For "all modules", create sections for each module
                const moduleGroups = {};
                allData.forEach(item => {
                    if (!moduleGroups[item.module]) moduleGroups[item.module] = [];
                    moduleGroups[item.module].push(item);
                });

                const sections = [];
                for (const [moduleName, moduleData] of Object.entries(moduleGroups)) {
                    const fieldConfig = getDisplayFields(moduleName);

                    // Add module heading
                    sections.push(new Paragraph({
                        text: moduleName.toUpperCase(),
                        heading: HeadingLevel.HEADING_2
                    }));
                    sections.push(new Paragraph({ text: "" })); // Spacer

                    // Create header row
                    const headerRow = new TableRow({
                        children: fieldConfig.headers.map(header =>
                            new TableCell({ children: [new Paragraph({ text: header, bold: true })] })
                        )
                    });

                    // Create data rows
                    const dataRows = moduleData.map(item =>
                        new TableRow({
                            children: fieldConfig.extractor(item).map(value =>
                                new TableCell({ children: [new Paragraph(String(value))] })
                            )
                        })
                    );

                    // Add table
                    sections.push(new Table({
                        rows: [headerRow, ...dataRows],
                        width: { size: 100, type: WidthType.PERCENTAGE }
                    }));
                    sections.push(new Paragraph({ text: "" })); // Spacer
                }

                const doc = new Document({
                    sections: [{
                        properties: {},
                        children: [
                            new Paragraph({ text: "International Affairs Report", heading: HeadingLevel.HEADING_1 }),
                            new Paragraph({ text: `Generated on: ${new Date().toLocaleDateString()}` }),
                            new Paragraph({ text: "Module: All Modules" }),
                            new Paragraph({ text: "" }), // Spacer
                            ...sections
                        ],
                    }],
                });

                const buffer = await Packer.toBuffer(doc);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.docx`);
                res.send(buffer);

            } else {
                // For single module, use module-specific columns
                const fieldConfig = getDisplayFields(modules);

                // Create header row
                const headerRow = new TableRow({
                    children: fieldConfig.headers.map(header =>
                        new TableCell({ children: [new Paragraph({ text: header, bold: true })] })
                    )
                });

                // Create data rows
                const tableRows = allData.map(item =>
                    new TableRow({
                        children: fieldConfig.extractor(item).map(value =>
                            new TableCell({ children: [new Paragraph(String(value))] })
                        )
                    })
                );

                const doc = new Document({
                    sections: [{
                        properties: {},
                        children: [
                            new Paragraph({ text: "International Affairs Report", heading: HeadingLevel.HEADING_1 }),
                            new Paragraph({ text: `Generated on: ${new Date().toLocaleDateString()}` }),
                            new Paragraph({ text: `Module: ${modules}` }),
                            new Paragraph({ text: "" }), // Spacer
                            new Table({
                                rows: [headerRow, ...tableRows],
                                width: { size: 100, type: WidthType.PERCENTAGE }
                            }),
                        ],
                    }],
                });

                const buffer = await Packer.toBuffer(doc);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.docx`);
                res.send(buffer);
            }
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
