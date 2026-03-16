
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join('d:', 'new-hope-erp', 'Internationalisation (Responses) (3).xlsx');
const outputPath = path.join(__dirname, 'excel_structure.json');

try {
    console.log(`Reading file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);

    const result = {};

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet['!ref']) {
            result[sheetName] = { headers: [], rowCount: 0 };
            return;
        }
        // Get range
        const range = XLSX.utils.decode_range(sheet['!ref']);
        // Get first row (headers)
        const headers = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: range.s.r }; // First row
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            const cell = sheet[cell_ref];
            if (cell && cell.v) headers.push(cell.v);
        }

        // Count rows
        const data = XLSX.utils.sheet_to_json(sheet);

        result[sheetName] = {
            headers: headers,
            rowCount: data.length,
            sample: data.length > 0 ? data[0] : null
        };
    });

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`Structure written to ${outputPath}`);

} catch (error) {
    console.error('Error reading file:', error.message);
    console.error(error);
}
