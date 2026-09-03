// Single round trip for the Analytics Dashboard's four stat cards + charts.
//
// Dashboard.jsx previously fired /campus-visits/stats, /events/stats,
// /partners/stats and /outreach/stats as four parallel HTTP calls. Each is a
// heavy multi-aggregation handler, so bundling them server-side still costs the
// same aggregation work — but one round trip, one connection slot, and the
// four heavy runs overlap instead of queueing behind the browser's per-host
// connection pool.
import { getEnhancedStats } from './enhancedStats.controller.js';
import CampusVisit from '../models/CampusVisit.js';
import Event from '../models/Event.js';
import Partner from '../models/Partner.js';
import Outreach from '../models/Outreach.js';

// Run one of the existing enhanced-stats handlers to completion and resolve
// with its stats object. The handlers answer only through res.json / res.status(…).json
// and — for the four models bundled here — never read req, so a minimal fake res
// is enough to reuse them verbatim (no duplicated aggregation logic to drift).
const collect = (handler) =>
    new Promise((resolve, reject) => {
        const res = {
            status: (code) => {
                res.statusCode = code;
                return res;
            },
            json: (body) => {
                if (body && body.success) resolve(body.stats);
                else reject(new Error((body && body.message) || 'Stats request failed'));
            }
        };
        handler({}, res).catch(reject);
    });

const MODULES = [
    ['campusVisits', CampusVisit],
    ['events', Event],
    ['partners', Partner],
    ['outreach', Outreach]
];

export const getDashboardStats = async (req, res) => {
    try {
        const entries = await Promise.all(
            MODULES.map(async ([key, Model]) => [key, await collect(getEnhancedStats(Model))])
        );
        const stats = Object.fromEntries(entries);
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: error.message
        });
    }
};
