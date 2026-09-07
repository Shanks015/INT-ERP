import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    EXPIRY_DATE_FIELDS,
    expiryDateField,
    startOfToday,
    isExpiredValue,
    activeCondition,
    expiredCondition,
    mergeConditions,
    currentlyActiveFragment
} from '../src/utils/recordExpiry.js';

// Unit tests for the read-time expiry derivation helpers. These pin the contract
// every controller relies on: dated modules map to their real end-date field, and
// the active/expired Mongo conditions exclude nulls (BSON sorts null before Dates,
// so a bare $lt would wrongly match records with no end date).
//
// isExpiredValue/startOfToday use the server-local clock, so tests freeze "now"
// to a fixed local instant and derive every candidate date from startOfToday()
// — never from hard-coded date strings, which would parse as UTC and disagree
// with local midnight depending on the machine's timezone.

const DAY = 24 * 60 * 60 * 1000;

// Freeze "now" at local noon on a fixed day.
const freezeToday = () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7, 12, 0, 0)); // 07/Sep/2026 local noon
};

describe('EXPIRY_DATE_FIELDS map', () => {
    it('maps each dated module to its real end-date field', () => {
        expect(EXPIRY_DATE_FIELDS).toEqual({
            StudentExchange: 'toDate',
            ImmersionProgram: 'departureDate',
            Membership: 'endDate',
            Partner: 'expiringDate',
            ScholarInResidence: 'endDate'
        });
    });

    it('expiryDateField returns null for modules without a lifecycle', () => {
        expect(expiryDateField('MastersAbroad')).toBeNull();
        expect(expiryDateField('MouSigningCeremony')).toBeNull();
        expect(expiryDateField('CampusVisit')).toBeNull();
    });
});

describe('isExpiredValue', () => {
    afterEach(() => vi.useRealTimers());

    it('is expired only once the end-date day has fully passed', () => {
        freezeToday();
        const todayStart = startOfToday();
        expect(isExpiredValue(new Date(todayStart.getTime() - 1))).toBe(true);   // just before midnight → expired
        expect(isExpiredValue(todayStart)).toBe(false);                          // exactly start of today → active
        expect(isExpiredValue(new Date(todayStart.getTime() + DAY))).toBe(false); // tomorrow → active
    });

    it('treats missing/null/invalid dates as not-expired', () => {
        freezeToday();
        expect(isExpiredValue(null)).toBe(false);
        expect(isExpiredValue(undefined)).toBe(false);
        expect(isExpiredValue('')).toBe(false);
        expect(isExpiredValue('not-a-date')).toBe(false);
    });
});

describe('active/expired Mongo conditions', () => {
    afterEach(() => vi.useRealTimers());

    it('activeCondition accepts null/missing end dates (never expire) plus today-or-later', () => {
        freezeToday();
        const cond = activeCondition('toDate');
        expect(cond.$or).toHaveLength(2);
        expect(cond.$or[0]).toEqual({ toDate: null }); // null side also matches missing — no $exists guard needed
        expect(cond.$or[1].toDate.$gte).toEqual(startOfToday());
    });

    it('expiredCondition guards against null and missing ($exists + $ne) before $lt', () => {
        freezeToday();
        const cond = expiredCondition('toDate');
        expect(cond.$and).toEqual([
            { toDate: { $exists: true } },
            { toDate: { $ne: null } },
            { toDate: { $lt: startOfToday() } }
        ]);
    });
});

describe('mergeConditions', () => {
    it('conjoins two non-empty fragments under $and', () => {
        expect(mergeConditions({ status: 'active' }, { a: 1 })).toEqual({
            $and: [{ status: 'active' }, { a: 1 }]
        });
    });

    it('treats empty fragments as no-ops', () => {
        expect(mergeConditions({ status: 'active' }, {})).toEqual({ status: 'active' });
        expect(mergeConditions({}, { a: 1 })).toEqual({ a: 1 });
        expect(mergeConditions({}, {})).toEqual({});
    });
});

describe('currentlyActiveFragment', () => {
    afterEach(() => vi.useRealTimers());

    it('returns an activeCondition for dated modules', () => {
        freezeToday();
        expect(currentlyActiveFragment('StudentExchange')).toEqual(activeCondition('toDate'));
    });

    it('returns {} for modules with no lifecycle', () => {
        expect(currentlyActiveFragment('MastersAbroad')).toEqual({});
    });
});

describe('startOfToday', () => {
    afterEach(() => vi.useRealTimers());

    it('returns the local midnight of the frozen instant', () => {
        freezeToday();
        const sot = startOfToday();
        expect(sot.getHours()).toBe(0);
        expect(sot.getMinutes()).toBe(0);
        expect(sot.getSeconds()).toBe(0);
        expect(sot.getFullYear()).toBe(2026);
        expect(sot.getMonth()).toBe(8); // September
        expect(sot.getDate()).toBe(7);
    });
});
