import { describe, it, expect } from 'vitest';
import { buildOutreachNewStages } from '../src/utils/outreachNewQuery.js';

// Pull the $match stages that sit before the $facet (the facet also contains
// $sort/$skip/$limit/$project inside `data`, but never a $match).
const preFacetMatches = (stages) =>
    stages.filter((s) => s.$match);

const facetData = (stages) =>
    stages.find((s) => s.$facet).$facet.data;

describe('buildOutreachNewStages — Outreach Mail list filters', () => {
    it('emits an active-only $match, a lastActivityAt $addFields, and the $facet by default', () => {
        const stages = buildOutreachNewStages();
        expect(preFacetMatches(stages)[0].$match.status).toBe('active');
        // default date field is lastActivityAt — no range given, so no second $match
        expect(preFacetMatches(stages)).toHaveLength(1);
        expect(stages[1].$addFields.lastActivityAt).toEqual({ $max: '$emails.sentAt' });
        expect(facetData(stages)[0]).toEqual({ $sort: { createdAt: -1 } }); // default sort unchanged
    });

    it('sorts asc when requested and allows lastActivityAt as a sort key', () => {
        const data = facetData(buildOutreachNewStages({ sortBy: 'lastActivityAt', sortOrder: 'asc' }));
        expect(data[0]).toEqual({ $sort: { lastActivityAt: 1 } });
    });

    it('falls back to createdAt desc for unknown sort keys', () => {
        const data = facetData(buildOutreachNewStages({ sortBy: 'notAField', sortOrder: 'weird' }));
        expect(data[0]).toEqual({ $sort: { createdAt: -1 } });
    });

    it('applies search as an $or across the same fields the old find() used', () => {
        const [match] = preFacetMatches(buildOutreachNewStages({ search: 'Oslo' }));
        expect(match.$match.$or).toHaveLength(4);
        for (const clause of match.$match.$or) {
            expect(clause).toMatchObject({});
            const field = Object.keys(clause)[0];
            expect(['university', 'country', 'contactName', 'email']).toContain(field);
            expect(clause[field]).toBeInstanceOf(RegExp);
        }
        // search regex is case-insensitive
        expect(match.$match.$or[0].university.flags).toContain('i');
    });

    it('matches country exactly and case-insensitively, escaping regex metachars', () => {
        const [m1] = preFacetMatches(buildOutreachNewStages({ country: 'United Kingdom' }));
        expect(m1.$match.country).toEqual({ $regex: '^United Kingdom$', $options: 'i' });
        const [m2] = preFacetMatches(buildOutreachNewStages({ country: 'a+b(c)' }));
        expect(m2.$match.country.$regex).toBe('^a\\+b\\(c\\)$'); // no regex injection
    });

    it('matches outreachStatus exactly, including spacey enum values', () => {
        const [m] = preFacetMatches(buildOutreachNewStages({ outreachStatus: 'Reply Received' }));
        expect(m.$match.outreachStatus).toBe('Reply Received');
    });

    it('maps hasUnreadReply "true"|"false" to booleans and ignores empty', () => {
        expect(preFacetMatches(buildOutreachNewStages({ hasUnreadReply: 'true' }))[0].$match.hasUnreadReply).toBe(true);
        expect(preFacetMatches(buildOutreachNewStages({ hasUnreadReply: 'false' }))[0].$match.hasUnreadReply).toBe(false);
        const [m] = preFacetMatches(buildOutreachNewStages({ hasUnreadReply: '' }));
        expect(m.$match.hasUnreadReply).toBeUndefined();
    });

    it('applies a day-window range on lastActivityAt by default (null-activity rows excluded)', () => {
        const stages = buildOutreachNewStages({ startDate: '2026-09-01', endDate: '2026-09-04' });
        const matches = preFacetMatches(stages);
        expect(matches).toHaveLength(2);
        const range = matches[1].$match.lastActivityAt;
        expect(range.$gte.toISOString()).toBe(new Date('2026-09-01T00:00:00.000').toISOString());
        expect(range.$lte.toISOString()).toBe(new Date('2026-09-04T23:59:59.999').toISOString());
        // $gte on the computed field means a doc with lastActivityAt null simply can't match.
    });

    it('targets createdAt instead when dateField=createdAt', () => {
        const stages = buildOutreachNewStages({ dateField: 'createdAt', startDate: '2026-08-01' });
        const range = preFacetMatches(stages)[1].$match.createdAt;
        expect(range.$gte.toISOString()).toBe(new Date('2026-08-01T00:00:00.000').toISOString());
        expect(range.$lte).toBeUndefined();
    });

    it('computes skip/limit from page and paginates inside the facet', () => {
        const data = facetData(buildOutreachNewStages({ page: 3, limit: 20 }));
        expect(data).toContainEqual({ $skip: 40 });
        expect(data).toContainEqual({ $limit: 20 });
    });

    it('drops only `emails` from the payload so CSV export fields survive', () => {
        const data = facetData(buildOutreachNewStages());
        expect(data[data.length - 1]).toEqual({ $project: { emails: 0 } });
    });

    it('coerces page/limit to sane integers', () => {
        const data = facetData(buildOutreachNewStages({ page: -5, limit: '0' }));
        expect(data).toContainEqual({ $skip: 0 });
        expect(data).toContainEqual({ $limit: 10 }); // 0/invalid limit falls back to the default
    });
});
