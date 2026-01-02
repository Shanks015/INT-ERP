
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const excelPath = path.join(__dirname, '..', '..', 'Internationalisation (Responses) (1).xlsx');

const debug = () => {
    const workbook = XLSX.readFile(excelPath);
    workbook.SheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet);
        if (data.length > 0) {
            console.log(`\nSheet: "${name}"`);
            console.log('Headers:', Object.keys(data[0]).map(k => `"${k}"`).join(', '));
        }
    });
};

debug();
