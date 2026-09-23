import { describe, it, expect } from 'vitest';
import {
    sheetTitle,
    cellValue,
    exportablePaths,
    buildSheetRows,
    columnName,
    BACKUP_MODULES,
    backupSpreadsheetName
} from '../src/services/sheetBackupService.js';

// Pure helpers only — no Drive/Sheets/Mongo in this file (same posture as
// driveService.test.js). Integration is exercised by scripts/_sheet_backup_now.

describe('sheetTitle — Google Sheets tab labels', () => {
    it('strips forbidden characters and trims', () => {
        expect(sheetTitle('MoU / Updates?')).toBe('MoU Updates');
        expect(sheetTitle('a\\b:c*d"e<f>g|h')).toBe('a b c d e f g h');
        expect(sheetTitle('  Outreach Mail  ')).toBe('Outreach Mail');
    });

    it('caps at 100 chars and never returns empty', () => {
        expect(sheetTitle('x'.repeat(200)).length).toBe(100);
        expect(sheetTitle('')).toBe('Sheet');
        expect(sheetTitle(null)).toBe('Sheet');
    });

    it('keeps realistic module titles intact', () => {
        expect(sheetTitle('Campus Visits')).toBe('Campus Visits');
        expect(sheetTitle('Scholars in Residence')).toBe('Scholars in Residence');
        expect(sheetTitle('Outreach (legacy)')).toBe('Outreach (legacy)');
    });
});

describe('cellValue — Sheets-safe cell coercion', () => {
    it('passes primitives through and maps nullish to empty string', () => {
        expect(cellValue('hello')).toBe('hello');
        expect(cellValue(42)).toBe(42);
        expect(cellValue(3.14)).toBe(3.14);
        expect(cellValue(null)).toBe('');
        expect(cellValue(undefined)).toBe('');
    });

    it('serializes dates as ISO and booleans as TRUE/FALSE', () => {
        expect(cellValue(new Date(Date.UTC(2026, 8, 15)))).toBe('2026-09-15T00:00:00.000Z');
        expect(cellValue(new Date('not-a-date'))).toBe('');
        expect(cellValue(true)).toBe('TRUE');
        expect(cellValue(false)).toBe('FALSE');
    });

    it('JSON-stringifies nested objects and arrays', () => {
        expect(cellValue({ a: 1 })).toBe('{"a":1}');
        expect(cellValue([1, 'x'])).toBe('[1,"x"]');
    });
});

describe('exportablePaths — schema → columns', () => {
    it('drops __v and select:false paths (passwords never exported)', () => {
        const schema = {
            paths: {
                name: { options: {} },
                password: { options: { select: false } },
                __v: { options: {} },
                status: { options: {} }
            }
        };
        expect(exportablePaths(schema)).toEqual(['name', 'status']);
    });
});

describe('buildSheetRows — header + data alignment', () => {
    it('prepends _id and maps each path in header order', () => {
        const schema = {
            paths: {
                university: { options: {} },
                country: { options: {} },
                date: { options: {} }
            }
        };
        const docs = [
            { _id: 'abc', university: 'DSU', country: 'India', date: new Date(Date.UTC(2026, 0, 2)) },
            { _id: 'def', university: 'MIT', country: 'USA', date: null }
        ];
        const { header, rows } = buildSheetRows(schema, docs);
        expect(header).toEqual(['_id', 'university', 'country', 'date']);
        expect(rows).toHaveLength(2);
        expect(rows[0][0]).toBe('abc');
        expect(rows[0][1]).toBe('DSU');
        expect(rows[0][3]).toBe('2026-01-02T00:00:00.000Z');
        expect(rows[1][3]).toBe('');
        // missing optional fields still produce a cell
        expect(rows[1]).toHaveLength(header.length);
    });

    it('handles an empty collection (header only is fine for the writer)', () => {
        const schema = { paths: { title: { options: {} } } };
        const { header, rows } = buildSheetRows(schema, []);
        expect(header).toEqual(['_id', 'title']);
        expect(rows).toEqual([]);
    });
});

describe('columnName — chunk range columns', () => {
    it('maps 1-based counts to A, Z, AA …', () => {
        expect(columnName(1)).toBe('A');
        expect(columnName(26)).toBe('Z');
        expect(columnName(27)).toBe('AA');
        expect(columnName(52)).toBe('AZ');
        expect(columnName(53)).toBe('BA');
    });
});

describe('BACKUP_MODULES — coverage contract', () => {
    it('has unique sheet titles and a model file for every entry', async () => {
        const titles = BACKUP_MODULES.map((m) => sheetTitle(m.sheet));
        expect(new Set(titles).size).toBe(titles.length);
        expect(BACKUP_MODULES.length).toBeGreaterThanOrEqual(15);
        for (const mod of BACKUP_MODULES) {
            const { default: Model } = await import(`../src/models/${mod.model}.js`);
            expect(Model, `model ${mod.model}`).toBeTruthy();
        }
    }, 30_000);

    it('default spreadsheet name is ERP Data Backup', () => {
        delete process.env.SHEET_BACKUP_SPREADSHEET_NAME;
        expect(backupSpreadsheetName()).toBe('ERP Data Backup');
        process.env.SHEET_BACKUP_SPREADSHEET_NAME = 'Custom';
        expect(backupSpreadsheetName()).toBe('Custom');
        delete process.env.SHEET_BACKUP_SPREADSHEET_NAME;
    });
});
