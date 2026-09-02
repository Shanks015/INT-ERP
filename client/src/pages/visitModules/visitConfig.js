/**
 * Shared config for the three split campus "visit/activity" modules.
 *
 * The original combined "Campus visits" sheet was split into three separate
 * modules — Campus Visit (University Visit), Guest Lecture / Seminar, and
 * Consultant Visit / Masters Desk — each with its own collection, page and
 * endpoint. All three share the same record shape, so the list and form pages
 * are driven by these config objects.
 *
 * `module` doubles as the REST path, the import module name and the stats
 * `moduleType`. `typeOptions.length > 1` controls whether the form/list expose
 * a type picker; a single-value module keeps its type fixed.
 */

export const campusVisitsConfig = {
    module: 'campus-visits',
    moduleLabel: 'Campus Visit',
    title: 'Campus Visits',
    subtitle: 'Manage international university visit records',
    noData: 'No campus visits found',
    cardTotal: 'Total Visits',
    detailTitle: 'Campus Visit Details',
    typeDefault: 'University Visit',
    typeOptions: ['University Visit']
};

export const seminarsConfig = {
    module: 'seminars',
    moduleLabel: 'Seminar',
    title: 'Guest Lecture / Seminar',
    subtitle: 'Manage guest lecture and seminar records',
    noData: 'No seminar records found',
    cardTotal: 'Total Sessions',
    detailTitle: 'Seminar / Guest Lecture Details',
    typeDefault: 'Seminar',
    typeOptions: ['Seminar', 'Guest Lecture']
};

export const consultantVisitsConfig = {
    module: 'consultant-visits',
    moduleLabel: 'Consultant Visit',
    title: 'Consultant Visit / Masters Desk',
    subtitle: 'Manage consultant visit and Masters Desk records',
    noData: 'No consultant visit records found',
    cardTotal: 'Total Visits',
    detailTitle: 'Consultant Visit Details',
    typeDefault: 'Consultant Visit',
    typeOptions: ['Consultant Visit']
};
