
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const excelPath = path.join(__dirname, '..', '..', 'Internationalisation (Responses) (1).xlsx');

const debug = () => {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = 'Masters Abroad';
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(`Sheet: ${sheetName}`);
    console.log(`Rows: ${data.length}`);
    if (data.length > 0) {
        console.log('Headers:', Object.keys(data[0]));
        console.log('Sample Row 1:', JSON.stringify(data[0], null, 2));
    }
};

debug();
