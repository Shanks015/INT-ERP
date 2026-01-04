import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', '..', 'MOU IA.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Sheet3'];
const data = XLSX.utils.sheet_to_json(ws);

console.log('Total rows:', data.length, '\n');

// Check for duplicates
const universities = {};
const duplicates = [];

data.forEach((row, index) => {
    const univ = row['UNIVERSITY'];
    const country = row['COUNTRY'];
    const key = `${country} - ${univ}`;

    if (universities[key]) {
        universities[key].count++;
        universities[key].rows.push(index + 2);
        if (universities[key].count === 2) {
            duplicates.push(key);
        }
    } else {
        universities[key] = { count: 1, rows: [index + 2] };
    }
});

if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate university entries:\n`);
    duplicates.forEach(dup => {
        console.log(`"${dup}" appears ${universities[dup].count} times in rows: ${universities[dup].rows.join(', ')}`);
    });
} else {
    console.log('No duplicates found!');
}

console.log(`\nUnique universities: ${Object.keys(universities).length}`);
console.log(`Total rows: ${data.length}`);
console.log(`Difference: ${data.length - Object.keys(universities).length} duplicate rows`);
