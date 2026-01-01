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

const fetchData = async (module, startDate, endDate, status) => {
    const query = {};
    if (startDate && endDate) {
        // Determine date field name (mostly 'date', but sometimes 'arrivalDate' etc)
        const dateField = ['scholars-in-residence', 'student-exchange'].includes(module) ? 'fromDate' :
            ['immersion-programs'].includes(module) ? 'arrivalDate' : 'date';
        query[dateField] = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (status && status !== 'all') {
        query.status = status;
    }

    const Model = getModel(module);
    if (!Model) return [];

    const data = await Model.find(query).lean();
    return data.map(item => ({ ...item, module }));
};

export const generateReport = async (req, res) => {
    try {
        const { format, modules, startDate, endDate, status } = req.body;
        const modulesToFetch = modules === 'all'
            ? ['partners', 'campus-visits', 'events', 'conferences', 'mou-signing-ceremonies', 'scholars-in-residence', 'mou-updates', 'immersion-programs', 'student-exchange', 'masters-abroad', 'memberships', 'digital-media']
            : modules;

        let allData = [];
        for (const mod of modulesToFetch) {
            const data = await fetchData(mod, startDate, endDate, status);
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
