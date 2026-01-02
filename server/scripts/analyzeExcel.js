import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file from root directory
const filePath = path.join(__dirname, '..', '..', 'Internationalisation (Responses) (1).xlsx');
console.log('Reading file from:', filePath);

const workbook = XLSX.readFile(filePath);

// Get all sheet names
const sheetNames = workbook.SheetNames;
console.log('Sheet Names:', sheetNames);
console.log('\n='.repeat(80));

// Read each sheet and display structure
sheetNames.forEach((sheetName, index) => {
    console.log(`\n\n### Sheet ${index + 1}: ${sheetName}`);
    console.log('='.repeat(80));

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Total Rows: ${jsonData.length}`);

    if (jsonData.length > 0) {
        // Show first row structure
        console.log('\nColumn Headers:');
        const headers = Object.keys(jsonData[0]);
        headers.forEach((header, idx) => {
            console.log(`  ${idx + 1}. ${header}`);
        });

        console.log('\nFirst 3 Sample Rows:');
        console.log(JSON.stringify(jsonData.slice(0, 3), null, 2));
    }
});

console.log('\n\n' + '='.repeat(80));
console.log('Analysis complete!');
