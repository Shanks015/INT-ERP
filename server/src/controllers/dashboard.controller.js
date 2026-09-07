// Single round trip for the Analytics Dashboard's four stat cards + charts.
//
// This intentionally does NOT reuse getEnhancedStats: that handler computes the
// full module analytics (distincts, recent-activity lists, expiry forecasts,
// email-domain splits, …) for the analytics pop-ups — ~57 DB round trips for the
// four modules it would take to feed a page that renders only a total, a trend
// and one distribution per module. Measured against Atlas that was ~700-900 ms
// per dashboard load (plus contention with /pending-counts on page load).
//
// Instead each module is served by ONE aggregate with a $facet: total, this/last
// month trend counts and the single chart distribution all come back in one
// round trip (~80 ms locally), with query semantics mirrored exactly from
// getEnhancedStats so the numbers are unchanged. A deterministic _id tie-break
// on the group sort stops equal-count rows from flip-flopping between loads.
import CampusVisit from '../models/CampusVisit.js';
import Event from '../models/Event.js';
import Partner from '../models/Partner.js';
import Outreach from '../models/Outreach.js';
import { activeCondition } from '../utils/recordExpiry.js';

// Month boundaries exactly as getEnhancedStats computes them (server-local).
const monthBounds = () => {
    const now = new Date();
    return {
        startOfThisMonth: new Date(now.getFullYear(), now.getMonth(), 1),
        startOfLastMonth: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        endOfLastMonth: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    };
};

// Trend window predicate from getEnhancedStats: match the domain date field, or
// fall back to createdAt when the date field is missing/null.
const windowMatch = (dateField, gte, lte) => ({
    $or: [
        { [dateField]: lte ? { $gte: gte, $lte: lte } : { $gte: gte } },
        { [dateField]: { $exists: false }, createdAt: lte ? { $gte: gte, $lte: lte } : { $gte: gte } },
        { [dateField]: null, createdAt: lte ? { $gte: gte, $lte: lte } : { $gte: gte } }
    ]
});

const count = (arr) => (arr && arr[0] && arr[0].n) || 0;

// One $facet aggregate per module. totalMatch mirrors getEnhancedStats' generic
// total (status:'active'); baseMatch is what trend windows filter by; distMatch
// is the distribution's own filter. extraCounts run additional $count facets.
const facetStats = (Model, { totalMatch, baseMatch, dateField, distMatch, distKey, distGroup, distLimit = 10, extraCounts = [] }) => {
    const { startOfThisMonth, startOfLastMonth, endOfLastMonth } = monthBounds();

    const facet = {
        totalCount: [{ $match: totalMatch }, { $count: 'n' }],
        thisMonthCount: [{ $match: { $and: [baseMatch, windowMatch(dateField, startOfThisMonth)] } }, { $count: 'n' }],
        lastMonthCount: [{ $match: { $and: [baseMatch, windowMatch(dateField, startOfLastMonth, endOfLastMonth)] } }, { $count: 'n' }]
    };

    if (distMatch) {
        facet[distKey] = [
            { $match: distMatch },
            { $group: { _id: `$${distGroup}`, value: { $sum: 1 } } },
            // _id tie-break keeps equal-count rows in a stable alphabetical order.
            { $sort: { value: -1, _id: 1 } },
            { $limit: distLimit },
            { $project: { _id: 0, name: '$_id', value: 1 } }
        ];
    }

    extraCounts.forEach(({ key, match }) => {
        facet[key] = [{ $match: match }, { $count: 'n' }];
    });

    return Model.aggregate([{ $facet: facet }]).then(([row]) => {
        const stats = {
            total: count(row.totalCount),
            trend: (() => {
                const thisMonth = count(row.thisMonthCount);
                const lastMonth = count(row.lastMonthCount);
                const change = thisMonth - lastMonth;
                const percentage = lastMonth > 0
                    ? +((change / lastMonth) * 100).toFixed(1)
                    : thisMonth > 0 ? 100 : 0;
                return {
                    change,
                    percentage,
                    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
                    // Raw window counts so the UI can tell a real flat comparison
                    // from "no records in either window" (bulk-imported datasets).
                    thisMonth,
                    lastMonth
                };
            })()
        };
        if (distMatch) stats[distKey] = row[distKey] || [];
        extraCounts.forEach(({ key }) => { stats[key] = count(row[key]); });
        return stats;
    });
};

const partnerActiveBase = {
    // Same casing-tolerant activeStatus check as getEnhancedStats, plus "not yet
    // expired" derived from expiringDate (the stored recordStatus goes stale — see
    // utils/recordExpiry.js). Two $or clauses can't sit at the same level, so they
    // are joined with $and.
    $and: [
        {
            $or: [
                { activeStatus: 'Active' },
                { activeStatus: 'active' },
                { activeStatus: { $regex: /^active$/i } }
            ]
        },
        activeCondition('expiringDate')
    ]
};

const NO_RESPONSE = /^(no\s*(reply|response)|n\/?a|-)$/i;

export const getDashboardStats = async (req, res) => {
    try {
        const [campusVisits, events, partners, outreach] = await Promise.all([
            facetStats(CampusVisit, {
                totalMatch: { status: 'active' },
                baseMatch: { status: 'active' },
                dateField: 'date',
                distMatch: { status: 'active', country: { $exists: true, $ne: '' } },
                distKey: 'countryDistribution',
                distGroup: 'country'
            }),
            facetStats(Event, {
                totalMatch: { status: 'active' },
                baseMatch: { status: 'active' },
                dateField: 'date',
                distMatch: { status: 'active', type: { $exists: true, $ne: '' } },
                distKey: 'eventTypeDistribution',
                distGroup: 'type'
            }),
            facetStats(Partner, {
                totalMatch: { status: 'active' },
                baseMatch: partnerActiveBase,
                dateField: 'createdAt',
                distMatch: { ...partnerActiveBase, status: 'active', country: { $exists: true, $ne: '' } },
                distKey: 'countryDistribution',
                distGroup: 'country'
            }),
            facetStats(Outreach, {
                totalMatch: { status: 'active' },
                baseMatch: { status: 'active' },
                dateField: 'createdAt',
                distMatch: { country: { $exists: true, $ne: '' } },
                distKey: 'countryDistribution',
                distGroup: 'country',
                distLimit: 15,
                extraCounts: [{
                    key: 'responded',
                    // Same responded-detection as the Outreach analytics case.
                    match: {
                        status: 'active',
                        $or: [
                            { outreachStatus: { $in: ['Reply Detected', 'Replied'] } },
                            { reply: { $exists: true, $ne: '', $not: NO_RESPONSE } }
                        ]
                    }
                }]
            })
        ]);

        // Outreach's response pie is derived (responded vs no-response) exactly as
        // the Outreach analytics case builds it.
        const responded = outreach.responded;
        delete outreach.responded;
        outreach.responseDistribution = [
            { name: 'Responded', value: responded },
            { name: 'No Response', value: outreach.total - responded }
        ];

        res.json({ success: true, stats: { campusVisits, events, partners, outreach } });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: error.message
        });
    }
};
