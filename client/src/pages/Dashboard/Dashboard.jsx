import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Users, FileText, GraduationCap, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        partners: 0,
        events: 0,
        scholars: 0,
        conferences: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // Fetch data from all modules
            const [partnersRes, eventsRes, scholarsRes, confsRes] = await Promise.all([
                api.get('/partners'),
                api.get('/events'),
                api.get('/scholars-in-residence'),
                api.get('/conferences')
            ]);

            setStats({
                partners: partnersRes.data.data?.length || 0,
                events: eventsRes.data.data?.length || 0,
                scholars: scholarsRes.data.data?.length || 0,
                conferences: confsRes.data.data?.length || 0
            });
        } catch (error) {
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
                    <div className="card-body">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-base-content/70 text-sm">Total Partners</p>
                                <p className="text-3xl font-bold">{stats.partners}</p>
                            </div>
                            <div className="bg-primary/10 p-3 rounded-lg">
                                <Users className="text-primary" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-base-content/70 text-sm">Events</p>
                                <p className="text-3xl font-bold">{stats.events}</p>
                            </div>
                            <div className="bg-secondary/10 p-3 rounded-lg">
                                <Calendar className="text-secondary" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-base-content/70 text-sm">Active Scholars</p>
                                <p className="text-3xl font-bold">{stats.scholars}</p>
                            </div>
                            <div className="bg-accent/10 p-3 rounded-lg">
                                <GraduationCap className="text-accent" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-base-content/70 text-sm">Conferences</p>
                                <p className="text-3xl font-bold">{stats.conferences}</p>
                            </div>
                            <div className="bg-info/10 p-3 rounded-lg">
                                <FileText className="text-info" size={24} />
                            </div>
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
