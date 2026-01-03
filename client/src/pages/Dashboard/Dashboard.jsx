import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Users, FileText, GraduationCap, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        counts: { partners: 0, conferences: 0, events: 0, scholars: 0 },
        charts: { eventTypes: [], scholarCountries: [], visitsByMonth: [] }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-base-100 p-3 rounded-lg shadow-lg border border-base-200">
                    <p className="font-semibold">{label}</p>
                    <p className="text-primary">
                        Count: {payload[0].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    const fetchStats = async () => {
        try {
            // Use the new aggregated endpoint - fast, cached, and single request
            const response = await api.get('/reports/dashboard-stats');

            setStats({
                counts: {
                    partners: response.data.stats.counts.partners,
                    conferences: response.data.stats.counts.conferences,
                    events: response.data.stats.counts.events,
                    scholars: response.data.stats.counts.scholars
                },
                charts: response.data.stats.charts
            });
        } catch (error) {
            console.error(error);
            toast.error('Error fetching statistics');
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



    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-base-content/70 mt-2">
                    Welcome back, {user?.name}!
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-base-content/70 text-sm">Total Partners</p>
                                <p className="text-3xl font-bold">{stats.counts.partners}</p>
                            </div>
                            <div className="bg-primary/10 p-3 rounded-lg">
                                <Users className="text-primary" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-base-content/70 text-sm">Events</p>
                                <p className="text-3xl font-bold">{stats.counts.events}</p>
                            </div>
                            <div className="bg-secondary/10 p-3 rounded-lg">
                                <Calendar className="text-secondary" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-base-content/70 text-sm">Active Scholars</p>
                                <p className="text-3xl font-bold">{stats.counts.scholars}</p>
                            </div>
                            <div className="bg-accent/10 p-3 rounded-lg">
                                <GraduationCap className="text-accent" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-base-content/70 text-sm">Conferences</p>
                                <p className="text-3xl font-bold">{stats.counts.conferences}</p>
                            </div>
                            <div className="bg-info/10 p-3 rounded-lg">
                                <FileText className="text-info" size={24} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                {/* Visits Trend */}
                <div className="card bg-base-100 shadow-xl overflow-hidden">
                    <div className="card-body p-4">
                        <h2 className="card-title text-sm mb-4">Campus Visits Trend</h2>
                        <div style={{ width: '100%', height: 300, minWidth: 0 }}>
                            <ResponsiveContainer width="99%" height="100%">
                                <BarChart data={stats.charts.visitsByMonth}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="name" fontSize={12} tick={{ fill: 'currentColor' }} />
                                    <YAxis fontSize={12} tick={{ fill: 'currentColor' }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', opacity: 0.1 }} />
                                    <Bar dataKey="visits" fill="oklch(var(--p))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Event Types */}
                <div className="card bg-base-100 shadow-xl overflow-hidden">
                    <div className="card-body p-4">
                        <h2 className="card-title text-sm mb-4">Event Types Distribution</h2>
                        <div style={{ width: '100%', height: 300, minWidth: 0 }}>
                            <ResponsiveContainer width="99%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.charts.eventTypes}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.charts.eventTypes.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'oklch(var(--p))' : 'oklch(var(--s))'} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Scholars by Country */}
                <div className="card bg-base-100 shadow-xl lg:col-span-2 overflow-hidden">
                    <div className="card-body p-4">
                        <h2 className="card-title text-sm mb-4">Top Scholar Origins</h2>
                        <div style={{ width: '100%', height: 300, minWidth: 0 }}>
                            <ResponsiveContainer width="99%" height="100%">
                                <BarChart data={stats.charts.scholarCountries} layout="vertical" margin={{ left: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis type="number" fontSize={12} tick={{ fill: 'currentColor' }} />
                                    <YAxis dataKey="name" type="category" fontSize={12} width={100} tick={{ fill: 'currentColor' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" fill="oklch(var(--a))" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title">Quick Links</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <a href="/partners" className="btn btn-outline">Partners</a>
                        <a href="/events" className="btn btn-outline">Events</a>
                        <a href="/campus-visits" className="btn btn-outline">Campus Visits</a>
                        <a href="/conferences" className="btn btn-outline">Conferences</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
