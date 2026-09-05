// outreachNewQuery.js — pure aggregation-stage builder for the Outreach Mail list
// (/outreach-new). Kept free of mongoose/DB so the filter semantics are unit-testable
// without a connection (mirrors formRouting.js → formRouting.test.js).
//
// OutreachNew has no single "outreach date" field — only timestamps.createdAt and the
// per-leg emails[].sentAt that drives the "Last Activity" column — so the pipeline
// computes a scalar `lastActivityAt` ($max over the legs) and then matches/sorts on it
// like a normal field. No schema change, no backfill, no drift across the many
// email-write paths (send / log-sent / IMAP ingest).
//
// Params (mirrors the controller's query surface):
//   page, limit, search, country, outreachStatus, hasUnreadReply,
//   dateField ('lastActivityAt' default | 'createdAt'), startDate, endDate (YYYY-MM-DD),
//   sortBy (allow-list incl. lastActivityAt), sortOrder ('asc'|'desc')

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTABLE = new Set(['createdAt', 'updatedAt', 'lastActivityAt', 'university', 'country', 'outreachStatus']);
const DATE_FIELDS = new Set(['createdAt', 'lastActivityAt']);

// Day-window semantics shared with the generic date filter (generic.controller.js):
// a start date means "from 00:00:00.000 that day", an end date "through 23:59:59.999".
const dayStart = (s) => new Date(`${s}T00:00:00.000`);
const dayEnd = (s) => new Date(`${s}T23:59:59.999`);

export const buildOutreachNewStages = ({
    page = 1,
    limit = 10,
    search = '',
    country = '',
    outreachStatus = '',
    hasUnreadReply = '',
    dateField = '',
    startDate = '',
    endDate = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
} = {}) => {
    const match = { status: 'active' };

    if (String(search).trim()) {
        const re = new RegExp(escapeRegex(String(search).trim()), 'i');
        match.$or = [
            { university: re },
            { country: re },
            { contactName: re },
            { email: re }
        ];
    }

    // Exact country, case-insensitive (same anchored semantics as the old .find()).
    if (country) {
        match.country = { $regex: `^${escapeRegex(String(country))}$`, $options: 'i' };
    }

    if (outreachStatus) {
        match.outreachStatus = String(outreachStatus);
    }

    if (String(hasUnreadReply) === 'true') match.hasUnreadReply = true;
    else if (String(hasUnreadReply) === 'false') match.hasUnreadReply = false;

    const stages = [
        { $match: match },
        // No legs → null (renders as "No communication yet" and sorts to the bottom).
        { $addFields: { lastActivityAt: { $max: '$emails.sentAt' } } }
    ];

    const field = DATE_FIELDS.has(String(dateField)) ? String(dateField) : 'lastActivityAt';
    const range = {};
    if (String(startDate).trim()) range.$gte = dayStart(String(startDate).trim());
    if (String(endDate).trim()) range.$lte = dayEnd(String(endDate).trim());
    if (Object.keys(range).length) stages.push({ $match: { [field]: range } });

    const sb = SORTABLE.has(String(sortBy)) ? String(sortBy) : 'createdAt';
    const so = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 10);

    // Drop only `emails` from the payload — every other field is kept so the CSV
    // export path (which reuses this list endpoint) is unaffected. Thread contents
    // are fetched per-record via /outreach-new/:id.
    const dataFacet = [
        { $sort: { [sb]: so } },
        { $skip: (p - 1) * l },
        { $limit: l },
        { $project: { emails: 0 } }
    ];

    stages.push({ $facet: { metadata: [{ $count: 'total' }], data: dataFacet } });

    return stages;
};
