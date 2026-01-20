import Outreach from '../models/Outreach.js';
import {
    getAll,
    getById,
    create,
    update,
    remove,
    approve,
    reject,
    getAllPending,
    exportCSV
} from './generic.controller.js';
import { getEnhancedStats } from './enhancedStats.controller.js';
import * as XLSX from 'xlsx'; // Use xlsx for both CSV and Excel parsing

export const getAllOutreach = getAll(Outreach);
export const getOutreachById = getById(Outreach);
export const createOutreach = create(Outreach);
export const updateOutreach = update(Outreach);
export const deleteOutreach = remove(Outreach);
export const approveOutreach = approve(Outreach);
export const rejectOutreach = reject(Outreach);
export const getOutreachPending = getAllPending(Outreach);
export const exportOutreachCSV = exportCSV(Outreach);
export const getOutreachStats = getEnhancedStats(Outreach);

// Custom Import for Outreach module (Supports CSV and Excel)
export const importOutreachCSV = async (req, res) => {
    const importId = new Date().getTime();
    console.log(`[Import ${importId}] Starting Outreach Data import`);

    try {
        if (!req.file) {
            console.error(`[Import ${importId}] No file uploaded`);
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log(`[Import ${importId}] File received: ${req.file.originalname}, Size: ${req.file.size} bytes, Mime: ${req.file.mimetype}`);

        const results = [];
        const errors = [];

        // Parse File using XLSX (handles both CSV and Excel)
        let rawData = [];
        try {
            console.log(`[Import ${importId}] Reading buffer with XLSX...`);
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                throw new Error('No sheets found in file');
            }
            const sheet = workbook.Sheets[sheetName];
            // Convert sheet to JSON with defaults to ensure columns exist
            rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            console.log(`[Import ${importId}] Parsed ${rawData.length} rows from sheet "${sheetName}"`);
        } catch (parseError) {
            console.error(`[Import ${importId}] File parsing error:`, parseError);
            return res.status(400).json({
                message: 'Failed to parse file. Please ensure it is a valid CSV or Excel file.',
                error: parseError.message
            });
        }

        // Process rows
        rawData.forEach((row, index) => {
            const rowNumber = index + 1;

            // Normalize keys to lowercase for flexible matching
            const rowData = {};
            Object.keys(row).forEach(key => {
                const cleanKey = key.toLowerCase().trim().replace(/^\uFEFF/, '');
                rowData[cleanKey] = row[key];
            });

            // Required fields: University, Email, Country
            const university = rowData.university || rowData.universityname || rowData['university name'];
            const email = rowData.email || rowData.emailaddress || rowData['email address'];
            const country = rowData.country || rowData.countryname || rowData['country name'];

            // Validation
            if (!university || !email || !country) {
                console.warn(`[Import ${importId}] Row ${rowNumber} skipped: Missing required fields (Univ, Email, or Country).`);
                errors.push({
                    row: rowNumber,
                    data: row, // Send back original row data for context
                    reason: 'Missing required fields: University, Email, or Country'
                });
                return;
            }

            // Optional fields mapping
            const contactPerson = rowData.contactperson || rowData.contact || rowData['contact person'] || '';
            const contactName = rowData.contactname || rowData.name || rowData['contact name'] || '';
            const phone = rowData.phone || rowData.phonenumber || rowData.mobile || '';
            const website = rowData.website || rowData.url || '';
            const partnershipType = rowData.partnershiptype || rowData.type || rowData['partnership type'] || '';
            const notes = rowData.notes || rowData.remarks || rowData.comments || '';
            const department = rowData.department || rowData.dept || '';

            // Reply: default to "No Response" if not provided
            let reply = rowData.reply || rowData.response || rowData.status || '';
            if (!reply || typeof reply !== 'string' || reply.trim() === '') {
                reply = 'No Response';
            }

            // Build outreach record
            const record = {
                name: contactName || contactPerson || university, // Best effort name
                country: String(country).trim(),
                university: String(university).trim(),
                email: String(email).trim(),
                contactPerson: String(contactPerson).trim(),
                contactName: String(contactName).trim(),
                phone: String(phone).trim(),
                website: String(website).trim(),
                partnershipType: String(partnershipType).trim(),
                reply: String(reply).trim(),
                notes: String(notes).trim(),
                department: String(department).trim(),
                approvalStatus: 'approved', // Auto-approve imported records
                status: 'active',
                createdBy: req.user._id,
                updatedBy: req.user._id
            };

            results.push(record);
        });

        // Insert valid records
        let successCount = 0;
        if (results.length > 0) {
            console.log(`[Import ${importId}] Attempting to insert ${results.length} valid records...`);
            try {
                const inserted = await Outreach.insertMany(results, { ordered: false });
                successCount = inserted.length;
                console.log(`[Import ${importId}] Successfully inserted ${successCount} records.`);
            } catch (insertError) {
                console.error(`[Import ${importId}] DB Insert Partial/Full Error:`, insertError.message);
                if (insertError.insertedDocs) {
                    successCount = insertError.insertedDocs.length;
                    console.log(`[Import ${importId}] Partial success count: ${successCount}`);
                }
            }
        } else {
            console.warn(`[Import ${importId}] No valid records found to insert.`);
        }

        res.status(200).json({
            message: 'Import completed',
            summary: {
                total: rawData.length,
                successful: successCount,
                failed: errors.length
            },
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error(`[Import ${importId}] CRITICAL IMPORT ERROR:`, error);
        res.status(500).json({
            message: 'Error processing import file',
            error: error.message
        });
    }
};
