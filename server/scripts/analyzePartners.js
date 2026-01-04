import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', '..', 'MOU IA.xlsx');
const wb = XLSX.readFile(filePath);

console.log('Sheet names:', wb.SheetNames);

const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('\n=== TOTAL COLUMNS:', data[0].length, '===\n');

console.log('=== ALL HEADERS (Non-empty) ===');
data[0].forEach((h, i) => {
    if (h && String(h).trim()) {
        console.log(`${i + 1}. ${h}`);
    }
});

console.log('\n=== FIRST DATA ROW (Non-empty fields) ===');
if (data.length > 1) {
    data[0].forEach((header, i) => {
        if (header && String(header).trim() && data[1][i]) {
            console.log(`${header}: ${data[1][i]}`);
        }
    });
}

console.log('\n=== TOTAL ROWS:', data.length - 1, '===');
