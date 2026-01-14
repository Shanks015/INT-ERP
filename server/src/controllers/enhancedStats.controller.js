// Enhanced stats controller with module-specific statistics
// Each module gets custom stats based on its unique fields

export const getEnhancedStats = (Model) => async (req, res) => {
    try {
        const modelName = Model.modelName;

        // Date ranges for trend calculation
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // Base stats all modules have
        const total = await Model.countDocuments({ status: 'active' });

        let stats = { total };

        // Determine the date field to use for trend calculation based on model
        let dateField = 'createdAt'; // fallback
        switch (modelName) {
            case 'CampusVisit':
                dateField = 'date'; // visitDate field is called 'date'
                break;
            case 'Event':
                dateField = 'date'; // event date
                break;
            case 'Partner':
                dateField = 'completedOn'; // when partnership was completed (use completedOn instead of signingDate)
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
                dateField = 'arrivalDate'; // when scholar arrived
                break;
            case 'MouUpdate':
                dateField = 'date'; // update date
                break;
            case 'ImmersionProgram':
                dateField = 'arrivalDate'; // program start
                break;
            case 'StudentExchange':
                dateField = 'arrivalDate'; // exchange start
                break;
            case 'MastersAbroad':
                dateField = 'startDate'; // program start
                break;
            case 'Membership':
                dateField = 'startDate'; // membership start
                break;
            case 'DigitalMedia':
                dateField = 'date'; // post/publication date
                break;
            default:
                dateField = 'createdAt'; // fallback for unknown models
        }

        // Calculate trend - compare this month to last month using the appropriate date field
        // Use $or to include records where the date field exists OR fall back to createdAt
        const thisMonthQuery = {
            status: 'active',
            $or: [
                { [dateField]: { $gte: startOfThisMonth } },
                { [dateField]: { $exists: false }, createdAt: { $gte: startOfThisMonth } },
                { [dateField]: null, createdAt: { $gte: startOfThisMonth } }
            ]
        };

        const lastMonthQuery = {
            status: 'active',
            $or: [
                { [dateField]: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
                { [dateField]: { $exists: false }, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
                { [dateField]: null, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }
            ]
        };

        const thisMonthCount = await Model.countDocuments(thisMonthQuery);
        const lastMonthCount = await Model.countDocuments(lastMonthQuery);

        // Calculate trend metrics
        const change = thisMonthCount - lastMonthCount;
        const percentage = lastMonthCount > 0
            ? ((change / lastMonthCount) * 100).toFixed(1)
            : thisMonthCount > 0 ? 100 : 0;

        stats.trend = {
            change,
            percentage: parseFloat(percentage),
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
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
                const [countryDistribution, universityDistribution] = await Promise.all([
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
                    ])
                ]);

                stats = {
                    ...stats,
                    countries,
                    universities,
                    countryDistribution,
                    universityDistribution
                };
                break;

            case 'Event':
                const [eventTypes, departments] = await Promise.all([
                    Model.distinct('type').then(arr => arr.filter(Boolean).length),
                    Model.distinct('department').then(arr => arr.filter(Boolean).length)
                ]);

                // Get distributions for charts
                const [eventTypeDistribution, departmentDistribution] = await Promise.all([
                    Model.aggregate([
                        { $match: { status: 'active', type: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$type', value: { $sum: 1 } } },
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
                    ])
                ]);

                stats = { ...stats, eventTypes, departments, eventTypeDistribution, departmentDistribution };
                break;

            case 'Conference':
                const [confCountries, confDepartments] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.distinct('department').then(arr => arr.filter(Boolean).length)
                ]);

                // Get distributions
                const [confCountryDist, confDeptDist] = await Promise.all([
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
                    ])
                ]);

                stats = {
                    ...stats,
                    countries: confCountries,
                    departments: confDepartments,
                    countryDistribution: confCountryDist,
                    departmentDistribution: confDeptDist
                };
                break;

            case 'MouSigningCeremony':
                const [mouCountries, mouDepartments] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.distinct('department').then(arr => arr.filter(Boolean).length)
                ]);
                stats = { ...stats, countries: mouCountries, departments: mouDepartments };
                break;

            case 'ScholarInResidence':
                const [scholarCountries, scholarDepartments] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.distinct('department').then(arr => arr.filter(Boolean).length)
                ]);
                stats = { ...stats, countries: scholarCountries, departments: scholarDepartments };
                break;

            case 'MouUpdate':
                const [mouUpdateCountries, activeUpdates] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.countDocuments({ activeStatus: 'Active', status: 'active' })
                ]);
                stats = { ...stats, countries: mouUpdateCountries, active: activeUpdates };
                break;

            case 'ImmersionProgram':
                const [immersionCountries, activeImmersion] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.countDocuments({ recordStatus: 'active', status: 'active' })
                ]);
                stats = { ...stats, countries: immersionCountries, active: activeImmersion };
                break;

            case 'StudentExchange':
                const [exchangeUniversities, activeExchange] = await Promise.all([
                    Model.distinct('exchangeUniversity').then(arr => arr.filter(Boolean).length),
                    Model.countDocuments({ recordStatus: 'active', status: 'active' })
                ]);
                stats = { ...stats, universities: exchangeUniversities, active: activeExchange };
                break;

            case 'MastersAbroad':
                const [mastersCountries, activeMasters] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.countDocuments({ recordStatus: 'active', status: 'active' })
                ]);
                stats = { ...stats, countries: mastersCountries, active: activeMasters };
                break;

            case 'Membership':
                const [membershipCountries, activeMemberships] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.countDocuments({ recordStatus: 'active', status: 'active' })
                ]);
                stats = { ...stats, countries: membershipCountries, active: activeMemberships };
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
                // Response calculation - check for actual responses vs \"No reply\"/\"No response\" text
                const hasResponseCount = await Model.countDocuments({
                    status: 'active',
                    reply: {
                        $exists: true,
                        $ne: '',
                        $nin: ['No reply', 'No response', 'no reply', 'no response', 'N/A', 'NA', '-']
                    }
                });
                const noResponseCount = stats.total - hasResponseCount;

                // Response distribution for pie chart
                const responseDistribution = [
                    { name: 'Responded', value: hasResponseCount },
                    { name: 'No Response', value: noResponseCount }
                ];

                stats = {
                    ...stats,
                    responses: hasResponseCount,
                    nonResponses: noResponseCount,
                    responseDistribution
                };
                break;

            case 'Partner':
                const partnerCountries = await Model.distinct('country').then(arr => arr.filter(Boolean).length);
                const activePartners = await Model.countDocuments({
                    status: 'active',
                    activeStatus: 'Active'
                });

                // Get country and status distributions
                const [partnerCountryDist, statusDistribution] = await Promise.all([
                    Model.aggregate([
                        { $match: { status: 'active', country: { $exists: true, $ne: '' } } },
                        { $group: { _id: '$country', value: { $sum: 1 } } },
                        { $sort: { value: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ]),
                    Model.aggregate([
                        { $match: { status: 'active' } },
                        { $group: { _id: '$activeStatus', value: { $sum: 1 } } },
                        { $project: { _id: 0, name: '$_id', value: 1 } }
                    ])
                ]);

                stats = {
                    ...stats,
                    countries: partnerCountries,
                    active: activePartners,
                    countryDistribution: partnerCountryDist,
                    statusDistribution
                };
                break;

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
