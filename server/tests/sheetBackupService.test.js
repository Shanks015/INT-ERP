import { describe, it, expect } from 'vitest';
import {
    sheetTitle,
    cellValue,
    exportablePaths,
    buildSheetRows,
    columnName,
    BACKUP_MODULES,
    IMPORT_COLUMNS,
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

describe('buildSheetRows — import-ready headers when slug is known', () => {
    it('uses IMPORT_COLUMNS headers (not _id/schema paths) for a known slug', () => {
        const schema = { paths: { universityName: { options: {} }, country: { options: {} } } };
        const docs = [{
            _id: 'abc',
            date: new Date(Date.UTC(2026, 0, 2)),
            type: 'Seminar',
            visitorName: 'Dr. Rao',
            country: 'India',
            universityName: 'DSU',
            summary: 'Talk',
            department: 'CSE',
            campus: 'Kudlu',
            driveLink: 'https://drive.google.com/x',
            notes: 'ok'
        }];
        const { header, rows } = buildSheetRows(schema, docs, 'campus-visits');
        expect(header).toEqual([
            'Date', 'Type', "Visitor's Name & Details", 'Country', 'University Name',
            'Summary', 'Purpose', 'Department', 'Campus', 'Drive Link', 'Notes'
        ]);
        expect(header).not.toContain('_id');
        expect(rows[0][0]).toBe('2026-01-02T00:00:00.000Z');
        expect(rows[0][4]).toBe('DSU');
        expect(rows[0]).toHaveLength(header.length);
    });

    it('maps masters-abroad using the importer typo header', () => {
        const schema = { paths: {} };
        const docs = [{ studentName: 'Asha', country: 'India', university: 'MIT', cgpa: 8.2 }];
        const { header, rows } = buildSheetRows(schema, docs, 'masters-abroad');
        expect(header[0]).toBe('Studetns Name');
        expect(rows[0][0]).toBe('Asha');
        expect(rows[0][7]).toBe(8.2);
    });

    it('folds immersion fees + currency into one Fees Per Pax cell', () => {
        const schema = { paths: {} };
        const docs = [{ feesPerPax: 8450, feesCurrency: 'AUD', direction: 'Incoming' }];
        const { header, rows } = buildSheetRows(schema, docs, 'immersion-programs');
        const i = header.indexOf('Fees Per Pax');
        expect(rows[0][i]).toBe('8450 AUD');
    });

    it('folds outreach-new alternate emails into the single Email cell', () => {
        const schema = { paths: {} };
        const docs = [{ email: 'a@x.edu', alternativeEmails: ['b@x.edu', 'c@x.edu'] }];
        const { header, rows } = buildSheetRows(schema, docs, 'outreach-new');
        expect(header[0]).toBe('University Name');
        expect(header).not.toContain('Email 2');
        expect(rows[0][2]).toBe('a@x.edu b@x.edu c@x.edu');
    });

    it('falls back to schema paths when slug is unknown', () => {
        const schema = { paths: { title: { options: {} } } };
        const { header, rows } = buildSheetRows(schema, [{ _id: 'x', title: 'T' }], undefined);
        expect(header).toEqual(['_id', 'title']);
        expect(rows).toEqual([['x', 'T']]);
    });

    it('handles an empty collection (header only is fine for the writer)', () => {
        const schema = { paths: { title: { options: {} } } };
        const { header, rows } = buildSheetRows(schema, [], undefined);
        expect(header).toEqual(['_id', 'title']);
        expect(rows).toEqual([]);
    });
});

describe('IMPORT_COLUMNS — every backup module has import headers', () => {
    it('covers all BACKUP_MODULES slugs', () => {
        for (const mod of BACKUP_MODULES) {
            expect(IMPORT_COLUMNS[mod.slug], `columns for ${mod.slug}`).toBeTruthy();
            const headers = IMPORT_COLUMNS[mod.slug].map((c) => c.header);
            expect(new Set(headers).size, `duplicate header in ${mod.slug}`).toBe(headers.length);
            for (const col of IMPORT_COLUMNS[mod.slug]) {
                expect(col.header && col.header.length > 0).toBe(true);
                expect(Boolean(col.path) || typeof col.get === 'function').toBe(true);
            }
        }
    });

    it('campus modules share the exact importer header set', () => {
        const expected = [
            'Date', 'Type', "Visitor's Name & Details", 'Country', 'University Name',
            'Summary', 'Purpose', 'Department', 'Campus', 'Drive Link', 'Notes'
        ];
        for (const slug of ['campus-visits', 'seminars', 'consultant-visits']) {
            expect(IMPORT_COLUMNS[slug].map((c) => c.header)).toEqual(expected);
        }
    });

    it('covers every non-workflow business field from a known model shape', () => {
        // Spot-check modules that previously dropped columns
        const outreach = IMPORT_COLUMNS.outreach.map((c) => c.header);
        expect(outreach).toContain('Name');
        expect(outreach).toContain('Outreach Status');
        expect(outreach).toContain('Sent Date');
        const meetings = IMPORT_COLUMNS['meeting-trackers'].map((c) => c.header);
        expect(meetings).toContain('Sheet Month');
        const partners = IMPORT_COLUMNS.partners.map((c) => c.header);
        expect(partners).toContain('Expiring Date');
    });

    it('partners keeps import headers first, then backup-only business fields', () => {
        const headers = IMPORT_COLUMNS.partners.map((c) => c.header);
        expect(headers.slice(0, 4)).toEqual(['Partner Name', 'Country', 'University', 'Status']);
        expect(headers).toContain('School');
        expect(headers).toContain('MoU Status');
        expect(headers).toContain('Contact Person');
        expect(headers).toContain('Expiring Date');
        expect(headers.length).toBeGreaterThanOrEqual(10);
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
