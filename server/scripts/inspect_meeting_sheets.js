import xlsx from 'xlsx';
import path from 'path';

const filePath = path.join('..', 'Meeting Trackers .xlsx');
console.log('Reading:', filePath);

try {
    const workbook = xlsx.readFile(filePath);
    console.log('Sheet Names:', workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        if (data.length > 0) {
            console.log(`\n--- Sheet: ${sheetName} ---`);
            console.log('Headers (Row 1):', data[0]);
            if (data.length > 1) {
                console.log('Row 2 sample:', data[1]);
            }
        }
    });
} catch (err) {
    console.error('Error reading workbook:', err);
}
