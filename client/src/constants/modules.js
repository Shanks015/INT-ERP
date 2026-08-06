/**
 * Single source of truth for the application's data modules.
 *
 * These identifiers are used for three related but distinct purposes:
 *   - `allowedModules[]` on a User (what an intern is permitted to see)
 *   - REST endpoint paths (`/partners`, `/campus-visits`, ...)
 *   - the `module` field on ActivityLog entries
 *
 * Previously each page declared its own list, and they had drifted: social-media
 * was missing from PendingActions (so pending social-media edits were invisible
 * to admins) and both social-media and meeting-trackers were missing from
 * MyRequests and Reports. Import them from here instead of re-declaring.
 */

// Every data module, in display order. `endpoint` doubles as the API path.
export const MODULES = [
    { name: 'partners', label: 'Partners', endpoint: '/partners' },
    { name: 'campus-visits', label: 'Campus Visits', endpoint: '/campus-visits' },
    { name: 'events', label: 'Events', endpoint: '/events' },
    { name: 'conferences', label: 'Conferences', endpoint: '/conferences' },
    { name: 'mou-signing-ceremonies', label: 'MoU Signing Ceremonies', endpoint: '/mou-signing-ceremonies' },
    { name: 'scholars-in-residence', label: 'Scholars in Residence', endpoint: '/scholars-in-residence' },
    { name: 'mou-updates', label: 'MoU Updates', endpoint: '/mou-updates' },
    { name: 'immersion-programs', label: 'Immersion Programs', endpoint: '/immersion-programs' },
    { name: 'student-exchange', label: 'Student Exchange', endpoint: '/student-exchange' },
    { name: 'masters-abroad', label: 'Masters Abroad', endpoint: '/masters-abroad' },
    { name: 'memberships', label: 'Memberships', endpoint: '/memberships' },
    { name: 'digital-media', label: 'Digital Media', endpoint: '/digital-media' },
    { name: 'social-media', label: 'Social Media', endpoint: '/social-media' },
    { name: 'outreach', label: 'Outreach', endpoint: '/outreach' },
    { name: 'meeting-trackers', label: 'Meeting Trackers', endpoint: '/meeting-trackers' },
];

// Non-data sections that can appear in allowedModules but have no CRUD endpoint.
export const NON_DATA_MODULES = [
    { name: 'dashboard', label: 'Dashboard' },
    { name: 'reports', label: 'Reports' },
    { name: 'settings', label: 'Settings' },
];

// Modules that support the maker-checker approval workflow.
// Currently all data modules do; kept separate so the distinction stays explicit
// if a future module opts out.
export const APPROVAL_MODULES = MODULES;

// Shape used by <select> dropdowns: { value, label }
export const MODULE_OPTIONS = MODULES.map(({ name, label }) => ({ value: name, label }));

// Shape used by the permission checkbox grid in UserManagement: { id, name }
export const PERMISSION_MODULES = [
    { id: 'dashboard', name: 'Dashboard' },
    ...MODULES.map(({ name, label }) => ({ id: name, name: label })),
    { id: 'reports', name: 'Reports' },
    { id: 'settings', name: 'Settings' },
];

export const getModuleLabel = (name) =>
    MODULES.find(m => m.name === name)?.label ||
    NON_DATA_MODULES.find(m => m.name === name)?.label ||
    name;
