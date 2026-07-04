import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';
import OutreachNew from '../src/models/OutreachNew.js';
import User from '../src/models/User.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const mongoURI = process.env.MONGODB_URI;
const filePath = 'C:\\Users\\saish\\Downloads\\Australia_Observership_Contacts.xlsx';

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('Connected!');

        // Find a default user to associate with
        const user = await User.findOne();
        const userId = user ? user._id : null;

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Skip first row (range: 1)
        const rawData = XLSX.utils.sheet_to_json(sheet, { range: 1, defval: '' });

        const results = [];
        
        rawData.forEach((row, index) => {
            const spreadsheetRowNumber = index + 3;
            if (spreadsheetRowNumber > 52) return;

            const rowData = {};
            Object.keys(row).forEach(key => {
                const cleanKey = key.toLowerCase().trim().replace(/^\uFEFF/, '');
                rowData[cleanKey] = row[key];
            });

            const email = rowData['official email id'] || rowData.email || rowData.emailaddress || rowData['email address'] || rowData['email 1'];
            const university = rowData['university name'] || rowData.university || rowData.universityname || rowData['university name'];
            const country = rowData.country || 'Australia';

            if (!university || !email) {
                console.log(`Skipping Row ${spreadsheetRowNumber}: missing university or email`);
                return;
            }

            const contactName = rowData['contact person name'] || rowData.contactname || rowData.name || '';
            const contactPerson = rowData['designation / role'] || rowData.contactperson || rowData.contact || '';
            const department = rowData.department || rowData.dept || '';
            const phone = rowData.phone || rowData.phonenumber || rowData.mobile || '';
            const website = rowData.website || rowData.url || '';
            const partnershipType = rowData.partnershiptype || rowData.type || rowData['partnership type'] || '';
            
            const cityState = rowData['city / state'] || '';
            const verificationStatus = rowData.status || '';
            
            let notes = rowData.notes || rowData.remarks || rowData.comments || '';
            if (cityState) notes += `\nCity/State: ${cityState}`;
            if (verificationStatus) notes += `\nVerification Status: ${verificationStatus}`;
            notes = notes.trim();

            results.push({
                university: String(university).trim(),
                country: String(country).trim(),
                email: String(email).trim(),
                alternativeEmails: [],
                contactPerson: String(contactPerson).trim(),
                contactName: String(contactName).trim(),
                phone: String(phone).trim(),
                website: String(website).trim(),
                partnershipType: String(partnershipType).trim(),
                notes: notes,
                department: String(department).trim(),
                outreachStatus: 'Not Sent',
                status: 'active',
                createdBy: userId,
                updatedBy: userId
            });
        });

        console.log(`Prepared ${results.length} records. Inserting to DB...`);
        
        // Optional: clear existing ones if you want to rebuild
        await OutreachNew.deleteMany({});
        
        const inserted = await OutreachNew.insertMany(results, { ordered: false });
        console.log(`Successfully imported ${inserted.length} records into OutreachNew!`);

    } catch (err) {
        console.error('Error running import:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

run();
