import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Users, Globe, Building2, Calendar, TrendingUp } from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import DistributionPieChart from '../../components/Charts/DistributionPieChart';
import DistributionBarChart from '../../components/Charts/DistributionBarChart';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        campusVisits: null,
        events: null,
        partners: null,
        outreach: null
    });

    useEffect(() => {
        fetchAllStats();
    }, []);

    const fetchAllStats = async () => {
        try {
            setLoading(true);
            const [campusVisits, events, partners, outreach] = await Promise.all([
                api.get('/campus-visits/stats'),
                api.get('/events/stats'),
                api.get('/partners/stats'),
                api.get('/outreach/stats')
            ]);

            setStats({
                campusVisits: campusVisits.data.stats,
                events: events.data.stats,
                partners: partners.data.stats,
                outreach: outreach.data.stats
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    const { campusVisits, events, partners, outreach } = stats;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                <p className="text-base-content/70 mt-2">
                    Welcome back, {user?.name}! Here's your comprehensive overview.
                </p>
            </div>

            {/* Overview Stats - Always Visible */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Overview Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard
                        title="Campus Visits"
                        value={campusVisits?.total || 0}
                        icon={Users}
                        color="primary"
                        trend={campusVisits?.trend}
                        onClick={() => navigate('/campus-visits')}
                    />
                    <StatsCard
                        title="Events"
                        value={events?.total || 0}
                        icon={Calendar}
                        color="secondary"
                        trend={events?.trend}
                        onClick={() => navigate('/events')}
                    />
                    <StatsCard
                        title="Partners"
                        value={partners?.total || 0}
                        icon={Globe}
                        color="info"
                        trend={partners?.trend}
                        onClick={() => navigate('/partners')}
                    />
                    <StatsCard
                        title="Outreach"
                        value={outreach?.total || 0}
                        icon={TrendingUp}
                        color="accent"
                        trend={outreach?.trend}
                        onClick={() => navigate('/outreach')}
                    />
                </div>
            </div>

            {/* Essential Analytics Charts */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Key Analytics</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Campus Visits by Country */}
                    <DistributionPieChart
                        data={campusVisits?.countryDistribution || []}
                        title="Campus Visits by Country"
                    />

                    {/* Events by Type */}
                    <DistributionPieChart
                        data={events?.eventTypeDistribution || []}
                        title="Events by Type"
                    />

                    {/* Partner Countries */}
                    <DistributionBarChart
                        data={partners?.countryDistribution || []}
                        title="Partner Countries"
                    />

                    {/* Outreach Response Rate */}
                    <DistributionPieChart
                        data={outreach?.responseDistribution || []}
                        title="Outreach Response Rate"
                    />
                </div>
            </div>

            {/* Quick Links */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title mb-4">Quick Access</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <a href="/campus-visits" className="btn btn-outline">Campus Visits</a>
                        <a href="/events" className="btn btn-outline">Events</a>
                        <a href="/partners" className="btn btn-outline">Partners</a>
                        <a href="/outreach" className="btn btn-outline">Outreach</a>
                        <a href="/conferences" className="btn btn-outline">Conferences</a>
                        <a href="/scholars-in-residence" className="btn btn-outline">Scholars</a>
                        <a href="/memberships" className="btn btn-outline">Memberships</a>
                        <a href="/digital-media" className="btn btn-outline">Digital Media</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

