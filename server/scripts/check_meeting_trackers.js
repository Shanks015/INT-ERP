import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXCEL_PATH = path.join(__dirname, '..', '..', 'Meeting Trackers .xlsx');

try {
    const workbook = XLSX.readFile(EXCEL_PATH);
    console.log('Sheet Names:', workbook.SheetNames);
    
    for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        const rawRows = XLSX.utils.sheet_to_json(sheet);
        console.log(`\nSheet: "${name}"`);
        console.log(`Row count: ${rawRows.length}`);
        
        if (rawRows.length > 0) {
            console.log('Headers:', Object.keys(rawRows[0]));
            console.log('Sample Row:', JSON.stringify(rawRows[0], null, 2));
        }
    }
} catch (error) {
    console.error('Error analyzing Meeting Trackers:', error);
}
