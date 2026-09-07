// Read-time "active/expired" lifecycle derivation.
//
// Every data module stores a `recordStatus` field ('active' | 'expired') that is
// only refreshed in `pre('save')` middleware, so the stored value goes stale the
// moment a record's end date passes while it sits in the DB — and bulk workbook
// imports (insertMany) never run that hook at all, which is exactly why imported
// rows stay 'active' forever (e.g. Student Exchange: 17/21 rows past their toDate
// still stored 'active'). A time-derived field can never stay truthful stored, so
// every READ path (list filters, stats counts, dashboards, reports) computes
// expiry from the module's real end date through these helpers instead. Writes
// (create/update) keep their pre('save') recompute for the stored value.

// Which date field drives expiry per module (Mongoose modelName → field). A
// module absent from this map (MastersAbroad, MouSigningCeremony, …) has no
// time-based lifecycle — its recordStatus is always 'active' and its Active
// card / Status filter are noise, not data.
export const EXPIRY_DATE_FIELDS = {
    StudentExchange: 'toDate',
    ImmersionProgram: 'departureDate',
    Membership: 'endDate',
    Partner: 'expiringDate',
    ScholarInResidence: 'endDate'
};

export const expiryDateField = (modelName) => EXPIRY_DATE_FIELDS[modelName] || null;

// Midnight at the start of "today". A record is expired once its end date is
// strictly before this — i.e. the end-date day has fully passed. Mirrors the
// models' `isExpired` virtuals and pre('save') hooks (end-of-day comparison).
export const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

// True when an end-date value (Date | ISO string | null) has fully passed.
export const isExpiredValue = (value) => !!value && new Date(value).getTime() < startOfToday().getTime();

// Mongo condition matching an EXPIRED record: field present, non-null, strictly
// before the start of today. ($ne:null is required because null sorts before
// Dates in BSON collation and would otherwise slip through $lt.)
export const expiredCondition = (field) => ({
    $and: [
        { [field]: { $exists: true } },
        { [field]: { $ne: null } },
        { [field]: { $lt: startOfToday() } }
    ]
});

// Mongo condition matching an ACTIVE (not-yet-finished) record: no end date at
// all ({field: null} matches documents where the field is also missing), or the
// end date is today-or-later — the same default as the model virtuals (no end
// date → never expires → active).
export const activeCondition = (field) => ({
    $or: [
        { [field]: null },
        { [field]: { $gte: startOfToday() } }
    ]
});

// Conjunction of two query fragments. Empty fragments are no-ops so callers can
// merge unconditionally.
export const mergeConditions = (a, b) => {
    const isEmpty = (q) => !q || typeof q !== 'object' || Object.keys(q).length === 0;
    if (isEmpty(a)) return isEmpty(b) ? {} : b;
    if (isEmpty(b)) return a;
    return { $and: [a, b] };
};

// Query fragment selecting currently-valid records for a module. Dated modules →
// activeCondition on their expiry field; modules with no lifecycle → {} (nothing
// to exclude), so `mergeConditions({ status: 'active' }, fragment)` is simply
// { status: 'active' } there.
export const currentlyActiveFragment = (modelName) => {
    const field = expiryDateField(modelName);
    return field ? activeCondition(field) : {};
};
