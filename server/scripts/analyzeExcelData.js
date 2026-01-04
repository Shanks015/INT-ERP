import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', '..', 'MOU IA.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Sheet3'];
const data = XLSX.utils.sheet_to_json(ws);

console.log('Total rows read from Excel:', data.length);
console.log('\n=== Analyzing each row ===\n');

data.forEach((row, index) => {
    const country = row['COUNTRY'] ? String(row['COUNTRY']).trim() : '';
    const university = row['UNIVERSITY'] ? String(row['UNIVERSITY']).trim() : '';

    if (!country || !university) {
        console.log(`Row ${index + 2}: MISSING DATA`);
        console.log(`  Country: "${country || 'EMPTY'}"`);
        console.log(`  University: "${university || 'EMPTY'}"`);
    } else if (index < 5 || index >= data.length - 5) {
        // Show first 5 and last 5 valid rows
        console.log(`Row ${index + 2}: ✅ ${country} - ${university}`);
    }
});

console.log('\n=== Summary ===');
const valid = data.filter(row => {
    const country = row['COUNTRY'] ? String(row['COUNTRY']).trim() : '';
    const university = row['UNIVERSITY'] ? String(row['UNIVERSITY']).trim() : '';
    return country && university;
});

console.log(`Total rows: ${data.length}`);
console.log(`Valid rows (has country + university): ${valid.length}`);
console.log(`Missing data rows: ${data.length - valid.length}`);
