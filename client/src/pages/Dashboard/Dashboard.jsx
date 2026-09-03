import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
            // One /dashboard/stats round trip replaces four parallel /stats calls;
            // the server runs the four aggregations concurrently.
            const response = await api.get('/dashboard/stats');
            setStats(response.data.stats || {
                campusVisits: null,
                events: null,
                partners: null,
                outreach: null
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
                        <Link to="/campus-visits" className="btn btn-outline">Campus Visits</Link>
                        <Link to="/events" className="btn btn-outline">Events</Link>
                        <Link to="/partners" className="btn btn-outline">Partners</Link>
                        <Link to="/outreach" className="btn btn-outline">Outreach</Link>
                        <Link to="/conferences" className="btn btn-outline">Conferences</Link>
                        <Link to="/scholars-in-residence" className="btn btn-outline">Scholars</Link>
                        <Link to="/memberships" className="btn btn-outline">Memberships</Link>
                        <Link to="/digital-media" className="btn btn-outline">Digital Media</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

