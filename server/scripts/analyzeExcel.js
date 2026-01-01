
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Internationalisation (Responses) (1).xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    console.log('Sheets found:', sheetNames);

    sheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length > 0) {
            console.log(`\n--- Sheet: ${sheetName} ---`);
            console.log('Headers:', jsonData[0]);
        }
    });

} catch (error) {
    console.error('Error reading file:', error.message);
}
