// statusBadge.js — maps a module's human status string to a daisyUI badge color
// class, so list Status columns can be highlighted the same way Direction is
// (e.g. Immersion programStatus, Student Exchange exchangeStatus, Scholar scholarStatus).
//
// Rule order matters — a status like "Not Coming" must hit the "not coming" rule
// before any generic fallback. Matching is case-insensitive and substring-based.

const RULES = [
    // happened / done
    { re: /complet|done|finished/i, cls: 'badge-success' },
    // happening now
    { re: /in progress|on ?going|ongoing|active/i, cls: 'badge-info' },
    // scheduled but not started
    { re: /upcoming|pending|planned|scheduled|confirmed|tentative|booked/i, cls: 'badge-warning' },
    // did not / will not happen
    { re: /cancel|not coming|no show|declined/i, cls: 'badge-error' },
    // stepped away part-way / opt-out (softer than a straight cancellation)
    { re: /withdraw|opt ?ed? ?out|postponed|rescheduled/i, cls: 'badge-neutral' },
];

export const statusBadgeClass = (status) => {
    const s = String(status ?? '').trim();
    if (!s) return 'badge-ghost';
    for (const { re, cls } of RULES) {
        if (re.test(s)) return cls;
    }
    return 'badge-ghost';
};
