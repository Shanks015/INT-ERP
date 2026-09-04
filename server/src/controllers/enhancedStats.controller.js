// Enhanced stats controller with module-specific statistics
// Each module gets custom stats based on its unique fields

const escapeRegex = (s) => String(s ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getEnhancedStats = (Model) => async (req, res) => {
    try {
        const modelName = Model.modelName;

        // Date ranges for trend calculation
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // Base stats all modules have. Events carry status:'active' like every other
        // module, so maker-checker pending_edit/pending_delete rows must be excluded.
        const total = await Model.countDocuments({ status: 'active' });

        let stats = { total };

        // Determine the date field to use for trend calculation based on model
        let dateField = 'createdAt'; // fallback
        switch (modelName) {
            case 'CampusVisit':
            case 'Seminar':
            case 'ConsultantVisit':
                dateField = 'date'; // visit/activity date field is called 'date'
                break;
            case 'Event':
                dateField = 'date'; // event date
                break;
            case 'Partner':
                dateField = 'createdAt'; // Use createdAt to reflect system activity/growth
                break;
            case 'Outreach':
                dateField = 'createdAt'; // outreach doesn't have a date field, use createdAt
                break;
            case 'Conference':
                dateField = 'date'; // conference date
                break;
            case 'MouSigningCeremony':
                dateField = 'date'; // ceremony date
                break;
            case 'ScholarInResidence':
                dateField = 'startDate'; // when the scholar's visit began
                break;
            case 'MouUpdate':
                dateField = 'date'; // update date
                break;
            case 'ImmersionProgram':
                dateField = 'arrivalDate'; // program start
                break;
            case 'StudentExchange':
                dateField = 'fromDate'; // exchange start (real field; arrivalDate doesn't exist)
                break;
            case 'MastersAbroad':
                dateField = 'createdAt'; // no domain date on the model — creation month is the honest signal
                break;
            case 'Membership':
                dateField = 'startDate'; // membership start
                break;
            case 'DigitalMedia':
                dateField = 'date'; // post/publication date
                break;
            case 'MeetingTracker':
                dateField = 'date'; // meeting date
                break;
            default:
                dateField = 'createdAt'; // fallback for unknown models
        }

        // Calculate trend - compare this month to last month using the appropriate date field
        // Use $or to include records where the date field exists OR fall back to createdAt
        // Trend base query: which records count as "active" for the module.
        // Events have no special case — they fall through to { status: 'active' }.
        let baseQuery = {};
        if (modelName === 'Partner') {
            baseQuery = {
                $or: [
                    { activeStatus: 'Active' },
                    { activeStatus: 'active' },
                    { activeStatus: { $regex: /^active$/i } }
                ],
                recordStatus: { $ne: 'expired' }
            };
        } else if (modelName === 'MouUpdate') {
            baseQuery = {
                $or: [
                    { validityStatus: 'Active' },
                    { validityStatus: 'active' },
                    { validityStatus: { $regex: /^active$/i } }
                ]
            };
        } else {
            baseQuery = { status: 'active' };
        }

        const thisMonthQuery = {
            $and: [
                baseQuery,
                {
                    $or: [
                        { [dateField]: { $gte: startOfThisMonth } },
                        { [dateField]: { $exists: false }, createdAt: { $gte: startOfThisMonth } },
                        { [dateField]: null, createdAt: { $gte: startOfThisMonth } }
                    ]
                }
            ]
        };

        const lastMonthQuery = {
            $and: [
                baseQuery,
                {
                    $or: [
                        { [dateField]: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
                        { [dateField]: { $exists: false }, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
                        { [dateField]: null, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }
                    ]
                }
            ]
        };

        const thisMonthCount = await Model.countDocuments(thisMonthQuery);
        const lastMonthCount = await Model.countDocuments(lastMonthQuery);

        // ... trend calculation details ... 



        // Calculate trend metrics
        const change = thisMonthCount - lastMonthCount;
        const percentage = lastMonthCount > 0
            ? ((change / lastMonthCount) * 100).toFixed(1)
            : thisMonthCount > 0 ? 100 : 0;

        stats.trend = {
            change,
            percentage: parseFloat(percentage),
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
            // Raw window counts so the UI can tell a real flat comparison from
            // "no records in either window" (bulk-imported datasets read 0 (0%)
            // until there is actual this-month activity).
            thisMonth: thisMonthCount,
            lastMonth: lastMonthCount
        };

        // Module-specific stats
        switch (modelName) {
            case 'CampusVisit':
                // Get distinct counts
                const [countries, universities] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.distinct('universityName').then(arr => arr.filter(Boolean).length)
                ]);

                // Get distributions for charts (top 10)
                const [countryDistribution, universityDistribution, purposeDistribution, typeDistribution, recentVisits] = await Promise.all([
                    Model.aggregate([
                        { $match: { status: 'active', country: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$country', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    Model.aggregate([
                        { $match: { status: 'active', universityName: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$universityName', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    // Purpose distribution
                    Model.aggregate([
                        { $match: { status: 'active', purpose: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$purpose', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    // Type distribution
                    Model.aggregate([
                        { $match: { status: 'active', type: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$type', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    // Recent visits (last 10)
                    Model.aggregate([
                        { $match: { status: 'active' } },
                        { $sort: { date: -1 } },
                        { $limit: 10 },
                        {
                            $project: {
                                _id: 0,
                                universityName: 1,
                                country: 1,
                                visitorName: 1,
                                date: 1,
                                type: 1
                            }
                        }
                    ])
                ]);

                stats = {
                    ...stats,
                    countries,
                    universities,
                    countryDistribution,
                    universityDistribution,
                    purposeDistribution,
                    typeDistribution,
                    recentVisits
                };
                break;

            case 'Seminar':
            case 'ConsultantVisit':
                {
                    // Same visit/activity shape as CampusVisit: country/university/purpose
                    // distributions plus recent activity. Identifiers are block-scoped so the
                    // names may mirror the CampusVisit case without colliding in this switch.
                    const [countries, universities] = await Promise.all([
                        Model.distinct('country').then(arr => arr.filter(Boolean).length),
                        Model.distinct('universityName').then(arr => arr.filter(Boolean).length)
                    ]);

                    const [countryDistribution, universityDistribution, purposeDistribution, typeDistribution, recentVisits] = await Promise.all([
                        Model.aggregate([
                            { $match: { status: 'active', country: { $exists: true, $ne: '' } } },
                            { $group: { _id: '$country', value: { $sum: 1 } } },
                            { $sort: { value: -1 } },
                            { $limit: 10 },
                            { $project: { _id: 0, name: '$_id', value: 1 } }
                        ]),
                        Model.aggregate([
                            { $match: { status: 'active', universityName: { $exists: true, $ne: '' } } },
                            { $group: { _id: '$universityName', value: { $sum: 1 } } },
                            { $sort: { value: -1 } },
                            { $limit: 10 },
                            { $project: { _id: 0, name: '$_id', value: 1 } }
                        ]),
                        Model.aggregate([
                            { $match: { status: 'active', purpose: { $exists: true, $ne: '' } } },
                            { $group: { _id: '$purpose', value: { $sum: 1 } } },
                            { $sort: { value: -1 } },
                            { $limit: 10 },
                            { $project: { _id: 0, name: '$_id', value: 1 } }
                        ]),
                        Model.aggregate([
                            { $match: { status: 'active', type: { $exists: true, $ne: '' } } },
                            { $group: { _id: '$type', value: { $sum: 1 } } },
                            { $sort: { value: -1 } },
                            { $project: { _id: 0, name: '$_id', value: 1 } }
                        ]),
                        Model.aggregate([
                            { $match: { status: 'active' } },
                            { $sort: { date: -1 } },
                            { $limit: 10 },
                            {
                                $project: {
                                    _id: 0,
                                    universityName: 1,
                                    country: 1,
                                    visitorName: 1,
                                    date: 1,
                                    type: 1
                                }
                            }
                        ])
                    ]);

                    stats = {
                        ...stats,
                        countries,
                        universities,
                        countryDistribution,
                        universityDistribution,
                        purposeDistribution,
                        typeDistribution,
                        recentVisits
                    };
                    break;
                }

            case 'Event':
                const [eventTypes, departments, eventCountries, eventTypeDistribution, departmentDistribution, recentEvents] = await Promise.all([
                    Model.distinct('type', { status: 'active' }).then(arr => arr.filter(Boolean).length),
                    Model.distinct('department', { status: 'active' }).then(arr => arr.filter(Boolean).length),
                    Model.distinct('universityCountry', { status: 'active' }).then(arr => arr.filter(Boolean).length),

                    // Event type distribution
                    Model.aggregate([
                        { $match: { status: 'active', type: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$type', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Department distribution
                    Model.aggregate([
                        { $match: { status: 'active', department: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$department', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Recent events (last 10, active only)
                    Model.aggregate([
                        { $match: { status: 'active' } },
                        { $sort: { date: -1 } },
                        { $limit: 10 },
                        {
                            $project: {
                                _id: 0,
                                title: 1,
                                type: 1,
                                department: 1,
                                universityCountry: 1,
                                date: 1
                            }
                        }
                    ])
                ]);

                stats = {
                    ...stats,
                    active: stats.total, // total above already counts status:'active'
                    countries: eventCountries, // Add countries from universityCountry
                    eventTypes,
                    departments,
                    eventTypeDistribution,
                    departmentDistribution,
                    recentEvents
                };
                break;

            case 'Conference':
                const [confCountries, confDepartments] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.distinct('department').then(arr => arr.filter(Boolean).length)
                ]);

                // Get distributions and recent conferences
                const [confCountryDist, confDeptDist, recentConferences] = await Promise.all([
                    Model.aggregate([
                        { $match: { status: 'active', country: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$country', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    Model.aggregate([
                        { $match: { status: 'active', department: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$department', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    // Recent conferences
                    Model.aggregate([
                        { $match: { status: 'active' } },
                        { $sort: { date: -1 } },
                        { $limit: 10 },
                        {
                            $project: {
                                _id: 0,
                                conferenceName: 1,
                                country: 1,
                                department: 1,
                                date: 1
                            }
                        }
                    ])
                ]);

                stats = {
                    ...stats,
                    countries: confCountries,
                    departments: confDepartments,
                    countryDistribution: confCountryDist,
                    departmentDistribution: confDeptDist,
                    recentConferences
                };
                break;

            case 'MouSigningCeremony':
                const [ceremonyCountries, ceremonyDepartments, activeCeremonies, ceremonyCountryDist, ceremonyDeptDist] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.distinct('department').then(arr => arr.filter(Boolean).length),

                    // Active ceremonies count
                    Model.countDocuments({ recordStatus: 'active', status: 'active' }),

                    // Country Distribution for Map
                    Model.aggregate([
                        { $match: { country: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$country', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 15 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Department Distribution
                    Model.aggregate([
                        { $match: { department: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$department', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ])
                ]);
                stats = {
                    ...stats,
                    countries: ceremonyCountries,
                    departments: ceremonyDepartments,
                    active: activeCeremonies,
                    countryDistribution: ceremonyCountryDist,
                    departmentDistribution: ceremonyDeptDist
                };
                break;

            case 'ScholarInResidence':
                const [scholarCountries, scholarDepartments, countryDist, departmentDist, universityDist, designationDist, activeScholarsDist, recentScholars] = await Promise.all([
                    // Basic counts
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.distinct('department').then(arr => arr.filter(Boolean).length),

                    // Country distribution
                    Model.aggregate([
                        { $match: { status: 'active', country: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$country', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Department distribution (top 10)
                    Model.aggregate([
                        { $match: { status: 'active', department: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$department', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // University distribution (top 10)
                    Model.aggregate([
                        { $match: { status: 'active', university: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$university', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Designation distribution (top 10)
                    Model.aggregate([
                        { $match: { status: 'active', designation: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$designation', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Active vs Expired
                    Model.aggregate([
                        { $match: { status: 'active' } },
                        { $group: { _id: '$recordStatus', value: { $sum: 1 } } },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Recent scholars (last 10)
                    Model.aggregate([
                        { $match: { status: 'active' } },
                        { $sort: { startDate: -1 } },
                        { $limit: 10 },
                        {
                            $project: {
                                _id: 0,
                                scholarName: 1,
                                country: 1,
                                university: 1,
                                designation: 1,
                                department: 1,
                                startDate: 1,
                                endDate: 1,
                                scholarStatus: 1,
                                recordStatus: 1
                            }
                        }
                    ])
                ]);

                stats = {
                    ...stats,
                    countries: scholarCountries,
                    departments: scholarDepartments,
                    countryDistribution: countryDist,
                    departmentDistribution: departmentDist,
                    universityDistribution: universityDist,
                    designationDistribution: designationDist,
                    activeScholars: activeScholarsDist,
                    recentScholars
                };
                break;

            case 'MouUpdate':
                // Check for various casing of 'active'
                const mouActiveMatch = {
                    $or: [
                        { validityStatus: 'Active' },
                        { validityStatus: 'active' },
                        { validityStatus: { $regex: /^active$/i } }
                    ]
                    // status: 'active' removed
                };

                const [
                    mouUpdateCountries,
                    activeUpdates,
                    mouCountryDist,
                    mouAgreementDist,
                    mouDeptDist
                ] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.countDocuments(mouActiveMatch),

                    // Country Distribution (Active Only) for Map
                    Model.aggregate([
                        {
                            $match: {
                                $and: [
                                    mouActiveMatch,
                                    { country: { $exists: true, $ne: '' } }
                                ]
                            }
                        },
                        { $group: { _id: '$country', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 15 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Agreement Type Distribution
                    Model.aggregate([
                        {
                            $match: {
                                $and: [
                                    mouActiveMatch,
                                    { agreementType: { $exists: true, $ne: '' } }
                                ]
                            }
                        },
                        { $group: { _id: '$agreementType', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 5 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Department Distribution (New Insight)
                    Model.aggregate([
                        {
                            $match: {
                                $and: [
                                    mouActiveMatch,
                                    { department: { $exists: true, $ne: '' } }
                                ]
                            }
                        },
                        { $group: { _id: '$department', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 5 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ])
                ]);

                stats = {
                    ...stats,
                    countries: mouUpdateCountries,
                    active: activeUpdates,
                    countryDistribution: mouCountryDist,
                    agreementTypes: mouAgreementDist,
                    departmentDistribution: mouDeptDist,
                    // Provide empty expiry forecast since MouUpdate has no expiry date field
                    expiryForecast: { upcoming: 0, mediumTerm: 0, longTerm: 0 },
                    avgDurationDays: 0,
                    expiringPartners: []
                };
                break;

            case 'ImmersionProgram':
                const todayImmersion = new Date();
                const threeMonthsAhead = new Date(todayImmersion.getTime() + 90 * 24 * 60 * 60 * 1000);
                const sixMonthsAhead = new Date(todayImmersion.getTime() + 180 * 24 * 60 * 60 * 1000);

                const [
                    immersionCountries,
                    activeImmersion,
                    immersionCountryDist,
                    immersionDirectionDist,
                    immersionUniversityDist,
                    immersionExpiryForecast,
                    endingSoonList,
                    avgProgramDuration
                ] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.countDocuments({ recordStatus: 'active', status: 'active' }),
                    Model.aggregate([
                        { $match: { country: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$country', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 15 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    Model.aggregate([
                        { $match: { direction: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$direction', value: { $sum: 1 } } },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    Model.aggregate([
                        { $match: { recordStatus: 'active', status: 'active', university: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$university', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    Model.aggregate([
                        {
                            $match: {
                                recordStatus: 'active',
                                status: 'active',
                                departureDate: { $exists: true, $ne: null }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                upcoming: {
                                    $sum: {
                                        $cond: [{ $lte: ['$departureDate', threeMonthsAhead] }, 1, 0]
                                    }
                                },
                                mediumTerm: {
                                    $sum: {
                                        $cond: [{
                                            $and: [
                                                { $gt: ['$departureDate', threeMonthsAhead] },
                                                { $lte: ['$departureDate', sixMonthsAhead] }
                                            ]
                                        }, 1, 0]
                                    }
                                },
                                longTerm: {
                                    $sum: {
                                        $cond: [{ $gt: ['$departureDate', sixMonthsAhead] }, 1, 0]
                                    }
                                }
                            }
                        }
                    ]),
                    Model.aggregate([
                        {
                            $match: {
                                recordStatus: 'active',
                                status: 'active',
                                departureDate: { $exists: true, $ne: null }
                            }
                        },
                        { $sort: { departureDate: 1 } },
                        { $limit: 10 },
                        {
                            $project: {
                                _id: 0,
                                partnerName: '$university',
                                country: 1,
                                expiringDate: '$departureDate',
                                agreementType: '$direction'
                            }
                        }
                    ]),
                    Model.aggregate([
                        {
                            $match: {
                                recordStatus: 'active',
                                status: 'active',
                                arrivalDate: { $exists: true, $ne: null },
                                departureDate: { $exists: true, $ne: null }
                            }
                        },
                        {
                            $project: {
                                duration: { $subtract: ['$departureDate', '$arrivalDate'] }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                avgDurationMs: { $avg: '$duration' }
                            }
                        }
                    ])
                ]);

                const immersionForecast = immersionExpiryForecast[0] || { upcoming: 0, mediumTerm: 0, longTerm: 0 };
                delete immersionForecast._id;

                const immersionAvgDurationDays = avgProgramDuration[0]?.avgDurationMs
                    ? Math.round(avgProgramDuration[0].avgDurationMs / (1000 * 60 * 60 * 24))
                    : 0;

                stats = {
                    ...stats,
                    countries: immersionCountries,
                    active: activeImmersion,
                    countryDistribution: immersionCountryDist,
                    directionDistribution: immersionDirectionDist,
                    topUniversities: immersionUniversityDist,
                    expiryForecast: immersionForecast,
                    expiringPartners: endingSoonList,
                    avgDurationDays: immersionAvgDurationDays,
                    agreementTypes: immersionDirectionDist
                };
                break;

            case 'StudentExchange':
                const [exchangeUniversities, exchangeCountries, activeExchange, seUniversityDistribution, seCountryDistribution, recentExchanges] = await Promise.all([
                    Model.distinct('exchangeUniversity').then(arr => arr.filter(Boolean).length),
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.countDocuments({ recordStatus: 'active', status: 'active' }),

                    // University distribution
                    Model.aggregate([
                        { $match: { status: 'active', exchangeUniversity: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$exchangeUniversity', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Country distribution
                    Model.aggregate([
                        { $match: { status: 'active', country: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$country', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Recent exchanges
                    Model.aggregate([
                        { $match: { status: 'active' } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 10 },
                        {
                            $project: {
                                _id: 0,
                                studentName: 1,
                                exchangeUniversity: 1,
                                country: 1,
                                direction: 1,
                                date: '$createdAt'
                            }
                        }
                    ])
                ]);

                stats = {
                    ...stats,
                    universities: exchangeUniversities,
                    countries: exchangeCountries,
                    active: activeExchange,
                    universityDistribution: seUniversityDistribution,
                    countryDistribution: seCountryDistribution,
                    recentExchanges
                };
                break;

            case 'MastersAbroad':
                const [
                    mastersCountries,
                    activeMasters,
                    mastersCountryDist,
                    mastersUniversityDist
                ] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.countDocuments({ recordStatus: 'active', status: 'active' }),
                    Model.aggregate([
                        { $match: { country: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$country', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 15 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    Model.aggregate([
                        { $match: { university: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$university', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ])
                ]);
                stats = {
                    ...stats,
                    countries: mastersCountries,
                    active: activeMasters,
                    countryDistribution: mastersCountryDist,
                    universityDistribution: mastersUniversityDist
                };
                break;

            case 'Membership':
                const todayMembership = new Date();
                const threeMonthsAheadMembership = new Date(todayMembership.getTime() + 90 * 24 * 60 * 60 * 1000);
                const sixMonthsAheadMembership = new Date(todayMembership.getTime() + 180 * 24 * 60 * 60 * 1000);

                const [
                    membershipCountries,
                    activeMemberships,
                    membershipCountryDist,
                    membershipOrganizationDist,
                    membershipStatusDist,
                    membershipExpiryForecast,
                    expiringMembershipsList,
                    avgMembershipDuration
                ] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.countDocuments({ recordStatus: 'active', status: 'active' }),
                    Model.aggregate([
                        { $match: { country: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$country', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 15 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    Model.aggregate([
                        { $match: { recordStatus: 'active', status: 'active', name: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$name', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    Model.aggregate([
                        { $match: { membershipStatus: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$membershipStatus', value: { $sum: 1 } } },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    Model.aggregate([
                        {
                            $match: {
                                recordStatus: 'active',
                                status: 'active',
                                endDate: { $exists: true, $ne: null }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                upcoming: {
                                    $sum: {
                                        $cond: [{ $lte: ['$endDate', threeMonthsAheadMembership] }, 1, 0]
                                    }
                                },
                                mediumTerm: {
                                    $sum: {
                                        $cond: [{
                                            $and: [
                                                { $gt: ['$endDate', threeMonthsAheadMembership] },
                                                { $lte: ['$endDate', sixMonthsAheadMembership] }
                                            ]
                                        }, 1, 0]
                                    }
                                },
                                longTerm: {
                                    $sum: {
                                        $cond: [{ $gt: ['$endDate', sixMonthsAheadMembership] }, 1, 0]
                                    }
                                }
                            }
                        }
                    ]),
                    Model.aggregate([
                        {
                            $match: {
                                recordStatus: 'active',
                                status: 'active',
                                endDate: { $exists: true, $ne: null }
                            }
                        },
                        { $sort: { endDate: 1 } },
                        { $limit: 10 },
                        {
                            $project: {
                                _id: 0,
                                partnerName: '$name',
                                country: 1,
                                expiringDate: '$endDate',
                                agreementType: '$membershipStatus'
                            }
                        }
                    ]),
                    Model.aggregate([
                        {
                            $match: {
                                recordStatus: 'active',
                                status: 'active',
                                startDate: { $exists: true, $ne: null },
                                endDate: { $exists: true, $ne: null }
                            }
                        },
                        {
                            $project: {
                                duration: { $subtract: ['$endDate', '$startDate'] }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                avgDurationMs: { $avg: '$duration' }
                            }
                        }
                    ])
                ]);

                const membershipForecast = membershipExpiryForecast[0] || { upcoming: 0, mediumTerm: 0, longTerm: 0 };
                delete membershipForecast._id;

                const membershipAvgDurationDays = avgMembershipDuration[0]?.avgDurationMs
                    ? Math.round(avgMembershipDuration[0].avgDurationMs / (1000 * 60 * 60 * 24))
                    : 0;

                stats = {
                    ...stats,
                    countries: membershipCountries,
                    active: activeMemberships,
                    countryDistribution: membershipCountryDist,
                    topUniversities: membershipOrganizationDist,
                    agreementTypes: membershipStatusDist,
                    expiryForecast: membershipForecast,
                    expiringPartners: expiringMembershipsList,
                    avgDurationDays: membershipAvgDurationDays
                };
                break;

            case 'DigitalMedia':
                const channels = await Model.distinct('channel').then(arr => arr.filter(Boolean).length);

                // Get channel distribution
                const channelDistribution = await Model.aggregate([
                    { $match: { status: 'active', channel: { $exists: true, $ne: '' } } },
                    { $group: { _id: '$channel', value: { $sum: 1 } } },
                    { $sort: { value: -1 } },
                    { $limit: 10 },
                    { $project: { _id: 0, name: '$_id', value: 1 } }
                ]);

                stats = { ...stats, channels, channelDistribution };
                break;

            case 'Outreach':
                const [
                    outreachCountries,
                    hasResponseCount,
                    outreachCountryDist,
                    partnerDist,
                    emailDomainDist
                ] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.countDocuments({
                        status: 'active',
                        $or: [
                            { outreachStatus: { $in: ['Reply Detected', 'Replied'] } },
                            {
                                reply: {
                                    $exists: true,
                                    $ne: '',
                                    // Use regex to exclude variations of "No Response", "No Reply", "N/A", "-"
                                    $not: /^(no\s*(reply|response)|n\/?a|-)$/i
                                }
                            }
                        ]
                    }),
                    Model.aggregate([
                        { $match: { country: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$country', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 15 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    Model.aggregate([
                        { $match: { name: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$name', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    Model.aggregate([
                        { $match: { email: { $exists: true, $ne: '' } } },
                        { $project: { domain: { $arrayElemAt: [{ $split: ['$email', '@'] }, 1] } } },
                        { $match: { domain: { $exists: true, $ne: null } } },
                        { $group: { _id: '$domain', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ])
                ]);
                const noResponseCount = stats.total - hasResponseCount;
                const responseDistribution = [
                    { name: 'Responded', value: hasResponseCount },
                    { name: 'No Response', value: noResponseCount }
                ];
                stats = {
                    ...stats,
                    countries: outreachCountries,
                    responses: hasResponseCount,
                    nonResponses: noResponseCount,
                    responseDistribution,
                    countryDistribution: outreachCountryDist,
                    partnerDistribution: partnerDist,
                    emailDomainDistribution: emailDomainDist
                };
                break;

            case 'Partner':
                const partnerCountries = await Model.distinct('country').then(arr => arr.filter(Boolean).length);

                // Check for various casing of 'active' and ensure record is not expired
                const activeMatch = {
                    $or: [
                        { activeStatus: 'Active' },
                        { activeStatus: 'active' },
                        { activeStatus: { $regex: /^active$/i } }
                    ],
                    recordStatus: { $ne: 'expired' },
                    status: 'active'
                };

                const activePartners = await Model.countDocuments(activeMatch);

                // Get Expiry Forecast and detailed distributions
                const today = new Date();
                const threeMonths = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
                const sixMonths = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000);

                const [
                    partnerCountryDist,
                    statusDistribution,
                    expiryForecast,
                    expiringPartnersList,
                    agreementTypeDist,
                    avgDurationResult,
                    topActiveUniversities
                ] = await Promise.all([
                    // Country Distribution (Active Only)
                    Model.aggregate([
                        {
                            $match: {
                                ...activeMatch,
                                country: { $exists: true, $ne: '' }
                            }
                        },
                        { $group: { _id: '$country', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Active Status Distribution (for verification of data quality)
                    Model.aggregate([
                        { $group: { _id: '$activeStatus', value: { $sum: 1 } } },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Expiry Forecast
                    Model.aggregate([
                        {
                            $match: {
                                ...activeMatch,
                                expiringDate: { $exists: true, $ne: null }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                upcoming: {
                                    $sum: {
                                        $cond: [{ $lte: ['$expiringDate', threeMonths] }, 1, 0]
                                    }
                                },
                                mediumTerm: {
                                    $sum: {
                                        $cond: [{
                                            $and: [
                                                { $gt: ['$expiringDate', threeMonths] },
                                                { $lte: ['$expiringDate', sixMonths] }
                                            ]
                                        }, 1, 0]
                                    }
                                },
                                longTerm: {
                                    $sum: {
                                        $cond: [{ $gt: ['$expiringDate', sixMonths] }, 1, 0]
                                    }
                                }
                            }
                        }
                    ]),

                    // Expiring Soon List (Top 10)
                    Model.aggregate([
                        {
                            $match: {
                                ...activeMatch,
                                expiringDate: { $exists: true, $ne: null }
                            }
                        },
                        { $sort: { expiringDate: 1 } },
                        { $limit: 10 },
                        {
                            $project: {
                                _id: 0,
                                partnerName: { $ifNull: ['$university', '$school'] },
                                country: 1,
                                expiringDate: 1,
                                agreementType: 1
                            }
                        }
                    ]),

                    // Agreement Type Distribution
                    Model.aggregate([
                        {
                            $match: {
                                ...activeMatch,
                                agreementType: { $exists: true, $ne: '' }
                            }
                        },
                        { $group: { _id: '$agreementType', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 5 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),

                    // Average Duration (in Days)
                    Model.aggregate([
                        {
                            $match: {
                                ...activeMatch,
                                signingDate: { $exists: true, $ne: null } // Use signingDate for start
                            }
                        },
                        {
                            $project: {
                                duration: { $subtract: [new Date(), '$signingDate'] }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                avgDurationMs: { $avg: '$duration' }
                            }
                        }
                    ]),

                    // Top Active Universities
                    Model.aggregate([
                        {
                            $match: {
                                ...activeMatch,
                                university: { $exists: true, $ne: '' }
                            }
                        },
                        { $group: { _id: '$university', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ])
                ]);

                // Process Expiry Forecast
                const forecast = expiryForecast[0] || { upcoming: 0, mediumTerm: 0, longTerm: 0 };
                delete forecast._id;

                // Process Avg Duration
                const avgDurationDays = avgDurationResult[0]?.avgDurationMs
                    ? Math.round(avgDurationResult[0].avgDurationMs / (1000 * 60 * 60 * 24))
                    : 0;

                stats = {
                    ...stats,
                    countries: partnerCountries,
                    active: activePartners,
                    countryDistribution: partnerCountryDist,
                    statusDistribution,
                    expiryForecast: forecast,
                    agreementTypes: agreementTypeDist,
                    avgDurationDays,
                    expiringPartners: expiringPartnersList,
                    topUniversities: topActiveUniversities,
                    activeCountryDistribution: partnerCountryDist,
                    recentAdditions: expiringPartnersList.slice(0, 5)
                };
                break;

            case 'MeetingTracker': {
                const {
                    search,
                    startDate,
                    endDate,
                    ...filters
                } = req.query;

                // Build query
                const filterQuery = { status: 'active' };

                // Search
                if (search && search.trim()) {
                    const searchRegex = { $regex: escapeRegex(search.trim()), $options: 'i' };
                    filterQuery.$or = [
                        { meetingId: searchRegex },
                        { meetingTitle: searchRegex },
                        { mode: searchRegex },
                        { platformLocation: searchRegex },
                        { hostOrganization: searchRegex },
                        { hostName: searchRegex },
                        { hostEmail: searchRegex },
                        { participants: searchRegex },
                        { keyAgenda: searchRegex },
                        { discussionSummary: searchRegex },
                        { actionItems: searchRegex },
                        { remarks: searchRegex },
                        { sheetMonth: searchRegex }
                    ];
                }

                // Date range
                if (startDate || endDate) {
                    filterQuery.date = {};
                    if (startDate) filterQuery.date.$gte = new Date(startDate);
                    if (endDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        filterQuery.date.$lte = end;
                    }
                }

                // Other filters
                Object.keys(filters).forEach(key => {
                    if (filters[key] && filters[key] !== 'all') {
                        filterQuery[key] = filters[key];
                    }
                });

                const todayMeeting = new Date();
                todayMeeting.setHours(0, 0, 0, 0);

                // Re-calculate total based on filterQuery
                const filterTotal = await Model.countDocuments(filterQuery);

                const [
                    upcomingCount,
                    onlineCount,
                    offlineCount
                ] = await Promise.all([
                    Model.countDocuments({
                        $and: [
                            filterQuery,
                            { date: { $gte: todayMeeting } }
                        ]
                    }),
                    Model.countDocuments({
                        $and: [
                            filterQuery,
                            { mode: { $regex: /^online$/i } }
                        ]
                    }),
                    Model.countDocuments({
                        $and: [
                            filterQuery,
                            { mode: { $regex: /^offline$/i } }
                        ]
                    })
                ]);

                stats = {
                    total: filterTotal,
                    upcoming: upcomingCount,
                    onlineCount,
                    offlineCount
                };
                break;
            }

            default:
                // If no specific stats defined, just return total
                break;
        }

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error fetching enhanced stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
};