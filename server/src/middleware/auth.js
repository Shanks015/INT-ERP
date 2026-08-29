import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Route prefixes that are never module-gated for interns: auth infrastructure,
// admin-only areas (already role-gated by authorize()), and infrastructure.
const UNGATED_PREFIXES = [
    'auth',
    'users',
    'activity-logs',
    'mailboxes',
    'google-forms',
    'health',
    'settings' // own profile/preferences — an intern manages their own settings
];

// Map URL prefixes to the module names used in allowedModules (client/src/constants/modules.js).
// Only outreach-new differs from its URL prefix.
const PREFIX_TO_MODULE = {
    'outreach-new': 'outreach',
    'campus-visits': 'campus-visits',
    'mou-signing-ceremonies': 'mou-signing-ceremonies',
    'scholars-in-residence': 'scholars-in-residence',
    'student-exchange': 'student-exchange',
    'masters-abroad': 'masters-abroad',
    'digital-media': 'digital-media',
    'social-media': 'social-media',
    'meeting-trackers': 'meeting-trackers',
    'partners': 'partners',
    'events': 'events',
    'conferences': 'conferences',
    'mou-updates': 'mou-updates',
    'immersion-programs': 'immersion-programs',
    'memberships': 'memberships',
    'outreach': 'outreach',
    'reports': 'reports',
    'import': null // resolved from the second path segment below
};

// Resolve which module a request touches, for intern permission checks.
// /api/import/:module carries the module in the second segment; everything
// else uses the first segment after /api.
const resolveModuleFromUrl = (originalUrl) => {
    const path = (originalUrl || '').split('?')[0]; // strip query string
    const segments = path.split('/').filter(Boolean); // ['api', 'partners', ...]
    const prefix = segments[1];
    if (!prefix) return null;

    if (prefix === 'import') {
        return segments[2] || null;
    }
    return PREFIX_TO_MODULE[prefix] !== undefined ? PREFIX_TO_MODULE[prefix] : prefix;
};

// Authenticate user via JWT token
export const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (!user.approved || user.approvalStatus !== 'approved') {
            return res.status(403).json({ message: 'Access denied. Account is not approved.' });
        }

        // Server-side module enforcement for interns. The client also gates
        // routes, but a crafted request skips the UI entirely.
        if (user.role === 'intern') {
            const segments = (req.originalUrl || '').split('?')[0].split('/').filter(Boolean);
            const prefix = segments[1];

            if (prefix && !UNGATED_PREFIXES.includes(prefix)) {
                const moduleName = resolveModuleFromUrl(req.originalUrl);
                const allowed = user.allowedModules || [];
                if (moduleName && !allowed.includes(moduleName)) {
                    return res.status(403).json({
                        message: `Access denied. You do not have permission for the ${moduleName} module.`
                    });
                }
            }
        }

        req.user = user;
        req.userId = user._id;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Authorize based on roles
export const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};
