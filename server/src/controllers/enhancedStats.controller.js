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

        // Calculate trend - compare this month to last month
        const thisMonthCount = await Model.countDocuments({
            status: 'active',
            createdAt: { $gte: startOfThisMonth }
        });

        const lastMonthCount = await Model.countDocuments({
            status: 'active',
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

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
                    Model.distinct('eventType').then(arr => arr.filter(Boolean).length),
                    Model.distinct('department').then(arr => arr.filter(Boolean).length)
                ]);
                stats = { ...stats, eventTypes, departments };
                break;

            case 'Conference':
                const [confCountries, confDepartments] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.distinct('department').then(arr => arr.filter(Boolean).length)
                ]);
                stats = { ...stats, countries: confCountries, departments: confDepartments };
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
                stats = { ...stats, channels };
                break;

            case 'Outreach':
                const responses = await Model.countDocuments({
                    status: 'active',
                    response: { $exists: true, $ne: '' }
                });
                const nonResponses = total - responses;
                stats = { ...stats, responses, nonResponses };
                break;

            case 'Partner':
                const [partnerCountries, activePartners] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.countDocuments({ activeStatus: 'Active', status: 'active' })
                ]);
                stats = { ...stats, countries: partnerCountries, active: activePartners };
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
