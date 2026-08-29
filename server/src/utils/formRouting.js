/**
 * Pure helpers for the Google Forms webhook.
 *
 * Kept free of database access so the routing rules can be unit-tested. The
 * ordering of the rules below is load-bearing: a generic keyword that is a
 * substring of a more specific one must be tested LAST, or it swallows the
 * specific form. 'mou signing' and 'mou update' both contain neither 'event'
 * nor each other, but "MoU Signing Ceremony Event 2026" contains BOTH
 * 'mou signing' and 'event' — so 'event' has to come after them.
 *
 * This class of mistake previously routed MoU records into the Events
 * collection, silently.
 */

// Ordered most-specific first. The first matching keyword wins.
export const FORM_ROUTES = [
    { keyword: 'campus visit', module: 'campus-visits' },
    { keyword: 'mou signing', module: 'mou-signing-ceremonies' },
    { keyword: 'mou update', module: 'mou-updates' },
    { keyword: 'student exchange', module: 'student-exchange' },
    { keyword: 'masters abroad', module: 'masters-abroad' },
    { keyword: 'digital media', module: 'digital-media' },
    { keyword: 'conference', module: 'conferences' },
    { keyword: 'scholar', module: 'scholars-in-residence' },
    { keyword: 'immersion', module: 'immersion-programs' },
    // Generic — must stay last, 'event' appears inside many specific titles.
    { keyword: 'event', module: 'events' },
];

/**
 * Map a Google Form title to a module identifier.
 * @returns {string|null} module id, or null when nothing matches
 */
export const resolveFormModule = (formTitle) => {
    if (!formTitle || typeof formTitle !== 'string') return null;
    const normalized = formTitle.toLowerCase();
    const match = FORM_ROUTES.find(route => normalized.includes(route.keyword));
    return match ? match.module : null;
};

/**
 * Build a lookup over a Google Forms `responses` array.
 * Matches question text by case-insensitive substring.
 */
export const buildAnswerLookup = (responses) => (keyword) => {
    if (!Array.isArray(responses)) return null;
    const entry = responses.find(r =>
        r && typeof r.question === 'string' &&
        r.question.toLowerCase().includes(String(keyword).toLowerCase())
    );
    return entry ? entry.answer : null;
};

/** Parse a form date answer, falling back to now when absent or unparseable. */
export const parseFormDate = (dateStr) => {
    if (!dateStr) return new Date();
    const parsed = new Date(dateStr);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};
