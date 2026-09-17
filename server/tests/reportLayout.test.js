import { describe, it, expect } from 'vitest';
import PDFDocument from 'pdfkit-table';
import { clampCell, columnWidths, rowHeight, planPages } from '../src/controllers/reports.controller.js';

// The report PDFs are A4 landscape with 20pt margins and 7pt body text, and the
// layout helpers measure text with the document they are handed — so they need a
// real one, set to the font the rows render in.
const landscapeDoc = () => {
    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
    doc.font('Helvetica').fontSize(7);
    return doc;
};

describe('clampCell', () => {
    it('collapses whitespace so a cell is never artificially tall', () => {
        expect(clampCell('line one\n\nline two   here')).toBe('line one line two here');
    });

    it('caps long text with an ellipsis', () => {
        const out = clampCell('x'.repeat(500));
        expect(out).toHaveLength(180);
        expect(out.endsWith('…')).toBe(true);
    });

    it('renders empty values as a dash', () => {
        expect(clampCell(null)).toBe('-');
        expect(clampCell(undefined)).toBe('-');
        expect(clampCell('   ')).toBe('-');
    });
});

describe('columnWidths', () => {
    it('fills the width it is given', () => {
        const doc = landscapeDoc();
        const rows = [['a', 'b', 'c'], ['d', 'e', 'f']];
        const sum = columnWidths(doc, ['One', 'Two', 'Three'], rows).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(800, 5);
    });

    it('leaves a date column wide enough for the whole date', () => {
        const doc = landscapeDoc();
        const rows = [['04/Apr/2026', 'x'.repeat(180)], ['05/May/2026', 'y'.repeat(180)]];
        const [dateWidth] = columnWidths(doc, ['Date', 'Discussion Summary'], rows);
        doc.font('Helvetica').fontSize(7);
        expect(dateWidth).toBeGreaterThanOrEqual(doc.widthOfString('04/Apr/2026') + 4);
    });

    it('does not let one huge cell starve the other columns', () => {
        const doc = landscapeDoc();
        const rows = [['04/Apr/2026', 'x'.repeat(180)]];
        const [, summaryWidth] = columnWidths(doc, ['Date', 'Discussion Summary'], rows);
        expect(summaryWidth).toBeGreaterThan(200);
    });
});

describe('planPages', () => {
    it('never plans a page whose rows are taller than the page', () => {
        const doc = landscapeDoc();
        const headers = ['A', 'B'];
        const widths = [400, 400];
        const cell = 'word '.repeat(40).trim();
        const rows = Array.from({ length: 40 }, () => [cell, cell]);
        const pages = planPages(doc, headers, rows, widths, 500, 500);

        expect(pages.length).toBeGreaterThan(1);
        expect(pages.flat()).toHaveLength(40);
        for (const page of pages) {
            const used = page.reduce((sum, row) => sum + rowHeight(doc, row, widths), 0);
            expect(used).toBeLessThanOrEqual(500);
        }
    });

    it('keeps a single row that cannot fit instead of dropping it', () => {
        const doc = landscapeDoc();
        const widths = [400, 400];
        const giant = ['word '.repeat(400).trim(), 'x'];
        const pages = planPages(doc, ['A', 'B'], [giant], widths, 500, 500);
        expect(pages).toHaveLength(1);
        expect(pages[0]).toHaveLength(1);
    });
});
