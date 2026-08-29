import { describe, it, expect } from 'vitest';
import {
    FORM_ROUTES,
    resolveFormModule,
    buildAnswerLookup,
    parseFormDate
} from '../src/utils/formRouting.js';
import { sanitizeInput } from '../src/controllers/generic.controller.js';

describe('resolveFormModule', () => {
    it('routes every keyword to its module', () => {
        expect(resolveFormModule('Campus Visit Form')).toBe('campus-visits');
        expect(resolveFormModule('MoU Signing Ceremony 2026')).toBe('mou-signing-ceremonies');
        expect(resolveFormModule('MoU Update Record')).toBe('mou-updates');
        expect(resolveFormModule('Student Exchange Application')).toBe('student-exchange');
        expect(resolveFormModule('Masters Abroad Tracker')).toBe('masters-abroad');
        expect(resolveFormModule('Digital Media Log')).toBe('digital-media');
        expect(resolveFormModule('International Conference')).toBe('conferences');
        expect(resolveFormModule('Scholar in Residence')).toBe('scholars-in-residence');
        expect(resolveFormModule('Immersion Program Details')).toBe('immersion-programs');
        expect(resolveFormModule('Event Registration')).toBe('events');
    });

    it('matches the most specific keyword first', () => {
        // 'event' is a substring of this title AND 'mou signing' is present —
        // the specific keyword must win or the record is misfiled into Events.
        expect(resolveFormModule('MoU Signing Ceremony Event 2026')).toBe('mou-signing-ceremonies');
        expect(resolveFormModule('MoU Update Event')).toBe('mou-updates');
        expect(resolveFormModule('Student Exchange Event')).toBe('student-exchange');
    });

    it('is case-insensitive', () => {
        expect(resolveFormModule('CAMPUS VISIT')).toBe('campus-visits');
        expect(resolveFormModule('mou signing')).toBe('mou-signing-ceremonies');
    });

    it('returns null for unknown, empty, or non-string titles', () => {
        expect(resolveFormModule('Totally Unrelated Form')).toBeNull();
        expect(resolveFormModule('')).toBeNull();
        expect(resolveFormModule(null)).toBeNull();
        expect(resolveFormModule(undefined)).toBeNull();
        expect(resolveFormModule(123)).toBeNull();
    });

    it('keeps the generic "event" route last in the table', () => {
        // Ordering is load-bearing — if 'event' moves above the specific
        // keywords, the precedence tests above will also fail, but this guards
        // the table itself.
        const eventIndex = FORM_ROUTES.findIndex(r => r.keyword === 'event');
        expect(eventIndex).toBe(FORM_ROUTES.length - 1);
    });
});

describe('buildAnswerLookup', () => {
    const responses = [
        { question: 'University Name', answer: 'MIT' },
        { question: 'Country of Origin', answer: 'USA' },
        { question: 'Date of Visit', answer: '2026-03-15' }
    ];

    it('finds answers by case-insensitive substring', () => {
        const getAnswer = buildAnswerLookup(responses);
        expect(getAnswer('university')).toBe('MIT');
        expect(getAnswer('COUNTRY')).toBe('USA');
        expect(getAnswer('Visit')).toBe('2026-03-15');
    });

    it('returns null for missing answers', () => {
        const getAnswer = buildAnswerLookup(responses);
        expect(getAnswer('nonexistent')).toBeNull();
    });

    it('returns null for non-array input', () => {
        const getAnswer = buildAnswerLookup(null);
        expect(getAnswer('university')).toBeNull();
    });
});

describe('parseFormDate', () => {
    it('parses valid date strings', () => {
        expect(parseFormDate('2026-03-15').toISOString()).toBe(new Date('2026-03-15').toISOString());
    });

    it('preserves the instant of Date objects', () => {
        const d = new Date('2026-01-01');
        expect(parseFormDate(d).getTime()).toBe(d.getTime());
    });

    it('falls back to now for missing or invalid input', () => {
        const before = Date.now();
        const fallback = parseFormDate('not-a-date').getTime();
        expect(fallback).toBeGreaterThanOrEqual(before);
        expect(parseFormDate(null).getTime()).toBeGreaterThanOrEqual(before);
        expect(parseFormDate(undefined).getTime()).toBeGreaterThanOrEqual(before);
    });
});

describe('sanitizeInput', () => {
    it('strips server-controlled fields', () => {
        const input = {
            university: 'MIT',
            country: 'USA',
            _id: '664f00000000000000000000',
            __v: 0,
            status: 'active',
            pendingChanges: { university: 'Evil' },
            deletionReason: null,
            createdBy: '664f00000000000000000001',
            updatedBy: '664f00000000000000000002',
            createdAt: '2020-01-01',
            updatedAt: '2020-01-01'
        };

        const clean = sanitizeInput(input);
        expect(clean).toEqual({ university: 'MIT', country: 'USA' });
    });

    it('keeps legitimate domain fields untouched', () => {
        const input = { university: 'MIT', expiringDate: '2030-01-01', contactPerson: 'Dr. X' };
        expect(sanitizeInput(input)).toEqual(input);
    });

    it('returns an empty object for null/undefined/non-object input', () => {
        expect(sanitizeInput(null)).toEqual({});
        expect(sanitizeInput(undefined)).toEqual({});
        expect(sanitizeInput('string')).toEqual({});
    });

    it('does not mutate the original payload', () => {
        const input = { status: 'active', university: 'MIT' };
        sanitizeInput(input);
        expect(input).toEqual({ status: 'active', university: 'MIT' });
    });
});
