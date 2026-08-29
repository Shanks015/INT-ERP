import OutreachNew from '../models/OutreachNew.js';
import MailboxConnection from '../models/MailboxConnection.js';
import { decrypt } from '../services/cryptoService.js';
import nodemailer from 'nodemailer';
import { logUserActivity, sanitizeInput } from './generic.controller.js';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// Helper to get SMTP host from IMAP host
const getSmtpHost = (imapHost) => {
    if (!imapHost) return 'smtp.gmail.com';
    if (imapHost.includes('gmail')) return 'smtp.gmail.com';
    if (imapHost.includes('outlook') || imapHost.includes('office365')) return 'smtp.office365.com';
    return imapHost.replace(/^imap\./i, 'smtp.');
};

// GET all records with pagination and filters
export const getAllOutreachNew = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            country = '',
            outreachStatus = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const query = { status: 'active' };

        if (search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { university: regex },
                { country: regex },
                { contactName: regex },
                { email: regex }
            ];
        }

        if (country) {
            query.country = { $regex: `^${country}$`, $options: 'i' };
        }

        if (outreachStatus) {
            query.outreachStatus = outreachStatus;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const [data, total] = await Promise.all([
            OutreachNew.find(query)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            OutreachNew.countDocuments(query)
        ]);

        res.json({
            success: true,
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching records', error: error.message });
    }
};

// GET single record by ID
export const getOutreachNewById = async (req, res) => {
    try {
        const record = await OutreachNew.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .populate('emails.sentBy', 'name email');

        if (!record || record.status !== 'active') {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        res.json({ success: true, data: record });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching record', error: error.message });
    }
};

// CREATE record manually
export const createOutreachNew = async (req, res) => {
    try {
        const record = new OutreachNew({
            ...sanitizeInput(req.body),
            createdBy: req.user._id,
            updatedBy: req.user._id
        });

        await record.save();
        await logUserActivity(req, 'create', 'OutreachNew', record);

        res.status(201).json({ success: true, message: 'Record created successfully', data: record });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating record', error: error.message });
    }
};

// UPDATE record
export const updateOutreachNew = async (req, res) => {
    try {
        const record = await OutreachNew.findByIdAndUpdate(
            req.params.id,
            { ...sanitizeInput(req.body), updatedBy: req.user._id },
            { new: true }
        );

        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        await logUserActivity(req, 'update', 'OutreachNew', record);

        res.json({ success: true, message: 'Record updated successfully', data: record });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating record', error: error.message });
    }
};

// DELETE record
// OutreachNew has no maker-checker workflow (no approve/reject routes, direct
// updates) — so deletion is a direct hard delete, consistent with the rest of
// this module. The previous implementation set status: 'deleted', which is not
// in the schema enum and made every delete fail with a ValidationError.
export const deleteOutreachNew = async (req, res) => {
    try {
        const record = await OutreachNew.findByIdAndDelete(req.params.id);

        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        await logUserActivity(req, 'delete', 'OutreachNew', record);

        res.json({ success: true, message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting record', error: error.message });
    }
};

// IMPORT XLSX/CSV File
export const importOutreachNewXLSX = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return res.status(400).json({ message: 'No sheets found in file' });
        }

        const sheet = workbook.Sheets[sheetName];
        
        // Parse rows as raw 2D array first to inspect layout
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rawRows.length === 0) {
            return res.status(400).json({ success: false, message: 'The uploaded file is empty' });
        }

        // Detect header row index dynamically
        let headerRowIndex = 0;
        const headerKeywords = ['university', 'email', 's.no.', 's.no', 'contact', 'point of contact', 'who collected'];
        
        for (let i = 0; i < Math.min(5, rawRows.length); i++) {
            const row = rawRows[i];
            if (Array.isArray(row)) {
                const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
                if (nonEmptyCells.length >= 2) {
                    const hasKeyword = row.some(cell => {
                        if (typeof cell !== 'string') return false;
                        const cleanCell = cell.toLowerCase().trim();
                        return headerKeywords.some(keyword => cleanCell.includes(keyword));
                    });
                    if (hasKeyword) {
                        headerRowIndex = i;
                        break;
                    }
                }
            }
        }

        const rawData = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: '' });

        const results = [];
        const errors = [];
        let stopProcessing = false;

        rawData.forEach((row, index) => {
            if (stopProcessing) return;

            const spreadsheetRowNumber = index + headerRowIndex + 2;

            // Check if this row is a legend/notes helper row at the end of the sheet
            const isLegendRow = Object.values(row).some(val => {
                if (typeof val !== 'string') return false;
                const lower = val.toLowerCase().trim();
                return lower.startsWith('legend:') || lower.startsWith('notes:') || lower.startsWith('disclaimer:');
            });
            if (isLegendRow) {
                stopProcessing = true;
                return;
            }

            const rowData = {};
            Object.keys(row).forEach(key => {
                const cleanKey = key.toLowerCase().trim().replace(/^\uFEFF/, '');
                rowData[cleanKey] = row[key];
            });

            // Flexible email & university column matching supporting all employee formats
            const rawEmail = rowData['official email id'] || rowData.email || rowData.emailaddress || rowData['email address'] || rowData['email 1'] || rowData['email id'];
            const university = rowData['university name'] || rowData.university || rowData.universityname || rowData.institution || rowData['institution name'];
            const country = rowData.country || rowData.countryname || 'Australia'; // Fallback to Australia if not present

            const rawEmailStr = String(rawEmail || '').trim();
            const emailsList = rawEmailStr
                .split(/[\s,;:\\\/]+/)
                .map(e => e.trim())
                .filter(e => e && e.includes('@'));

            const email = emailsList[0] || '';
            const alternativeEmails = emailsList.slice(1);

            if (!university || !email) {
                const hasAnyData = Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '');
                if (hasAnyData) {
                    errors.push({
                        row: spreadsheetRowNumber,
                        reason: `Missing required fields. (University: ${!!university}, Email: ${!!email})`
                    });
                }
                return;
            }

            // Flexible contacts mapping supporting points of contact, professor names, etc.
            const contactName = rowData['contact person name'] || rowData['point of contact'] || rowData['professor name'] || rowData.contactname || rowData.name || '';
            const contactPerson = rowData['designation / role'] || rowData['designation'] || rowData.contactperson || rowData.contact || '';
            const department = rowData.department || rowData.dept || '';
            const phone = rowData.phone || rowData.phonenumber || rowData.mobile || '';
            const website = rowData.website || rowData.url || '';
            const partnershipType = rowData.partnershiptype || rowData.type || rowData['partnership type'] || '';
            
            const cityState = rowData['city / state'] || '';
            const verificationStatus = rowData.status || '';
            const whoCollected = rowData['who collected'] || rowData['collected by'] || '';
            
            let notes = rowData.notes || rowData.remarks || rowData.comments || '';
            if (cityState) notes += `\nCity/State: ${cityState}`;
            if (verificationStatus) notes += `\nVerification Status: ${verificationStatus}`;
            if (whoCollected) notes += `\nCollected By: ${whoCollected}`;
            notes = notes.trim();

            results.push({
                university: String(university).trim(),
                country: String(country).trim(),
                email: String(email).trim(),
                alternativeEmails,
                contactPerson: String(contactPerson).trim(),
                contactName: String(contactName).trim(),
                phone: String(phone).trim(),
                website: String(website).trim(),
                partnershipType: String(partnershipType).trim(),
                notes: notes,
                department: String(department).trim(),
                outreachStatus: 'Not Sent',
                status: 'active',
                createdBy: req.user._id,
                updatedBy: req.user._id
            });
        });

        let successCount = 0;
        if (results.length > 0) {
            const inserted = await OutreachNew.insertMany(results, { ordered: false });
            successCount = inserted.length;
        }

        res.json({
            success: true,
            summary: {
                total: rawData.length,
                successful: successCount,
                failed: errors.length
            },
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error processing import file', error: error.message });
    }
};

// SEND SMTP EMAIL from employee mailbox connection
export const sendOutreachNewEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, body, signature } = req.body;

        const outreach = await OutreachNew.findById(id);
        if (!outreach) {
            return res.status(404).json({ success: false, message: 'Outreach record not found' });
        }

        // Find Mailbox Connection for this employee
        const mailbox = await MailboxConnection.findOne({ employee: req.user._id });
        if (!mailbox || mailbox.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'No active mailbox connection found for your account. Please set up your Mailbox in Settings -> Mailbox Connections.'
            });
        }

        // Decrypt password
        const appPassword = decrypt(mailbox.appPassword);
        const smtpHost = getSmtpHost(mailbox.imapHost);

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: 465,
            secure: true,
            auth: {
                user: mailbox.emailAddress,
                pass: appPassword
            }
        });

        // Parse attachments
        const attachments = [];
        if (req.files && req.files.length > 0) {
            const dir = path.join(process.cwd(), 'uploads/attachments');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            for (const file of req.files) {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const filename = `${uniqueSuffix}-${cleanName}`;
                const filePath = path.join(dir, filename);
                fs.writeFileSync(filePath, file.buffer);

                attachments.push({
                    filename: file.originalname,
                    path: filePath, // local path for nodemailer
                    webPath: `/uploads/attachments/${filename}`, // web path for logging
                    contentType: file.mimetype
                });
            }
        }

        // Format HTML body with signature
        let htmlContent = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333;">`;
        htmlContent += body.replace(/\n/g, '<br/>');
        if (signature && signature.trim()) {
            htmlContent += `<br/><br/>--<br/>${signature.replace(/\n/g, '<br/>')}`;
        }
        htmlContent += `</div>`;

        // Send mail
        const mailOptions = {
            from: `"${req.user.name}" <${mailbox.emailAddress}>`,
            to: outreach.email,
            subject: subject,
            html: htmlContent,
            attachments: attachments.map(a => ({
                filename: a.filename,
                path: a.path,
                contentType: a.contentType
            }))
        };

        const info = await transporter.sendMail(mailOptions);
        const messageId = info.messageId;

        // Log sent mail in the record thread
        outreach.emails.push({
            messageId,
            direction: 'sent',
            from: mailbox.emailAddress,
            to: outreach.email,
            subject,
            body: body + (signature ? `\n\n--\n${signature}` : ''),
            sentAt: new Date(),
            sentBy: req.user._id,
            sentByName: req.user.name,
            attachments: attachments.map(a => ({
                filename: a.filename,
                path: a.webPath,
                contentType: a.contentType
            }))
        });

        outreach.outreachStatus = 'Sent';
        outreach.hasUnreadReply = false;
        await outreach.save();

        res.json({ success: true, message: 'Email sent successfully', data: outreach });
    } catch (error) {
        console.error('[OutreachNew Email Send Error]', error);
        res.status(500).json({ success: false, message: 'Error sending email: ' + error.message });
    }
};

// MARK AS READ (clear unread reply status)
export const markAsRead = async (req, res) => {
    try {
        const record = await OutreachNew.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        record.hasUnreadReply = false;
        await record.save();

        res.json({ success: true, message: 'Record marked as read', data: record });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating record', error: error.message });
    }
};

// LOG SENT EMAIL (for Gmail redirect)
export const logSentEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, body } = req.body;

        const outreach = await OutreachNew.findById(id);
        if (!outreach) {
            return res.status(404).json({ success: false, message: 'Outreach record not found' });
        }

        // Log sent mail in the record thread
        outreach.emails.push({
            direction: 'sent',
            from: req.user.email,
            to: outreach.email,
            subject,
            body,
            sentAt: new Date(),
            sentBy: req.user._id,
            sentByName: req.user.name
        });

        outreach.outreachStatus = 'Sent';
        outreach.hasUnreadReply = false;
        await outreach.save();

        res.json({ success: true, message: 'Email logged successfully', data: outreach });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error logging email: ' + error.message });
    }
};
