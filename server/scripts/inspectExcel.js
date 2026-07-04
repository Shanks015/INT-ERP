import XLSX from 'xlsx';

const filePath = 'C:\\Users\\saish\\Downloads\\Australia_Observership_Contacts.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    console.log('Sheet Names:', workbook.SheetNames);
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Parse as 2D array to see exact row numbers and layout
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log('Total Rows parsed:', rows.length);
    console.log('\n--- First 10 rows ---');
    for (let i = 0; i < Math.min(15, rows.length); i++) {
        console.log(`Row ${i + 1}:`, rows[i]);
    }
    
    console.log('\n--- Rows 50 to 57 ---');
    for (let i = 49; i < Math.min(57, rows.length); i++) {
        console.log(`Row ${i + 1}:`, rows[i]);
    }
} catch (err) {
    console.error('Error reading Excel file:', err);
}
