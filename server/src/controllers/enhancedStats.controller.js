// Enhanced stats controller with module-specific statistics
// Each module gets custom stats based on its unique fields

export const getEnhancedStats = (Model) => async (req, res) => {
    try {
        const modelName = Model.modelName;

        // Base stats all modules have
        const total = await Model.countDocuments({ status: 'active' });

        let stats = { total };

        // Module-specific stats
        switch (modelName) {
            case 'CampusVisit':
                const [countries, universities] = await Promise.all([
                    Model.distinct('country').then(arr => arr.filter(Boolean).length),
                    Model.distinct('universityName').then(arr => arr.filter(Boolean).length)
                ]);
                stats = { ...stats, countries, universities };
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
