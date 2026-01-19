import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

/**
 * Export analytics data to PDF
 */
export const exportToPDF = async (data, chartRefs = {}) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPos = 20;

    // Header
    pdf.setFontSize(20);
    pdf.setTextColor(40, 40, 40);
    pdf.text(`${data.title} Analytics Report`, pageWidth / 2, yPos, { align: 'center' });

    yPos += 10;
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });

    yPos += 15;

    // Summary Stats Table
    pdf.setFontSize(14);
    pdf.setTextColor(40, 40, 40);
    pdf.text('Summary Statistics', 14, yPos);
    yPos += 5;

    const summaryData = [
        ['Metric', 'Value'],
        ['Total', data.total || '-'],
        ['Active', data.active || '-'],
        ['Countries/Regions', data.countries || data.universities || data.departments || '-'],
        ['Module', data.moduleType || '-']
    ];

    pdf.autoTable({
        startY: yPos,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 14, right: 14 }
    });

    yPos = pdf.lastAutoTable.finalY + 15;

    // Country Distribution (if available)
    if (data.countryDistribution && data.countryDistribution.length > 0) {
        if (yPos > pageHeight - 60) {
            pdf.addPage();
            yPos = 20;
        }

        pdf.setFontSize(14);
        pdf.text('Geographic Distribution', 14, yPos);
        yPos += 5;

        const geoData = [
            ['Rank', 'Country', 'Count', 'Share %']
        ];

        data.countryDistribution.slice(0, 10).forEach((item, index) => {
            const percentage = ((item.value / data.total) * 100).toFixed(1);
            geoData.push([
                (index + 1).toString(),
                item.name,
                item.value.toString(),
                percentage
            ]);
        });

        pdf.autoTable({
            startY: yPos,
            head: [geoData[0]],
            body: geoData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: [66, 139, 202] },
            margin: { left: 14, right: 14 }
        });
    }

    // Footer
    const footerY = pageHeight - 10;
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('International Affairs ERP System', pageWidth / 2, footerY, { align: 'center' });

    // Save
    const filename = `${data.title.replace(/\s+/g, '_')}_Analytics_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
};

/**
 * Export analytics data to Excel
 */
export const exportToExcel = (data) => {
    const workbook = XLSX.utils.book_new();

    // Overview Sheet
    const overviewData = [
        ['Metric', 'Value'],
        ['Title', data.title],
        ['Module Type', data.moduleType],
        ['Stat Type', data.statType],
        ['Total', data.total || '-'],
        ['Active', data.active || '-'],
        ['Countries/Regions', data.countries || data.universities || data.departments || '-'],
        ['Generated', new Date().toLocaleString()]
    ];

    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // Geographic Distribution Sheet
    if (data.countryDistribution && data.countryDistribution.length > 0) {
        const geoData = [
            ['Rank', 'Country', 'Count', 'Percentage']
        ];

        data.countryDistribution.forEach((item, index) => {
            const percentage = ((item.value / data.total) * 100).toFixed(2);
            geoData.push([
                index + 1,
                item.name,
                item.value,
                percentage + '%'
            ]);
        });

        const geoSheet = XLSX.utils.aoa_to_sheet(geoData);
        XLSX.utils.book_append_sheet(workbook, geoSheet, 'Geographic Distribution');
    }

    // Trend Data Sheet (if available)
    if (data.trendData && data.trendData.length > 0) {
        const trendSheetData = [
            ['Month', 'Current Year', 'Previous Year']
        ];

        data.trendData.forEach(item => {
            trendSheetData.push([
                item.month,
                item.current,
                item.previous
            ]);
        });

        const trendSheet = XLSX.utils.aoa_to_sheet(trendSheetData);
        XLSX.utils.book_append_sheet(workbook, trendSheet, 'Trends');
    }

    // Save
    const filename = `${data.title.replace(/\s+/g, '_')}_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
};

/**
 * Export analytics data to CSV
 */
export const exportToCSV = (data) => {
    let csvContent = '';

    // Header
    csvContent += `"${data.title} Analytics Report"\n`;
    csvContent += `"Generated: ${new Date().toLocaleString()}"\n\n`;

    // Summary
    csvContent += '"Summary Statistics"\n';
    csvContent += '"Metric","Value"\n';
    csvContent += `"Total","${data.total || '-'}"\n`;
    csvContent += `"Active","${data.active || '-'}"\n`;
    csvContent += `"Countries/Regions","${data.countries || data.universities || data.departments || '-'}"\n\n`;

    // Geographic Distribution
    if (data.countryDistribution && data.countryDistribution.length > 0) {
        csvContent += '"Geographic Distribution"\n';
        csvContent += '"Rank","Country","Count","Percentage"\n';

        data.countryDistribution.forEach((item, index) => {
            const percentage = ((item.value / data.total) * 100).toFixed(2);
            csvContent += `"${index + 1}","${item.name}","${item.value}","${percentage}%"\n`;
        });
    }

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${data.title.replace(/\s+/g, '_')}_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
