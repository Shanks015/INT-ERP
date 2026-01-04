import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import {
    Users, Globe, Building2, Calendar, Tag, GraduationCap, FileText,
    RefreshCw, Plane, UserCheck, Radio, Mail, CheckCircle,
    ChevronDown, ChevronUp
} from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import DistributionPieChart from '../../components/Charts/DistributionPieChart';
import DistributionBarChart from '../../components/Charts/DistributionBarChart';

const Dashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [allModuleStats, setAllModuleStats] = useState({});
    const [expandedSections, setExpandedSections] = useState({
        overview: true,
        campusVisits: false,
        events: false,
        partners: false
    });

    useEffect(() => {
        fetchAllStats();
    }, []);

    const fetchAllStats = async () => {
        try {
            setLoading(true);
            // Fetch stats from all modules in parallel
            const [campusVisits, events, conferences, partners, outreach, digitalMedia] = await Promise.all([
                api.get('/campus-visits/stats'),
                api.get('/events/stats'),
                api.get('/conferences/stats'),
                api.get('/partners/stats'),
                api.get('/outreach/stats'),
                api.get('/digital-media/stats')
            ]);

            setAllModuleStats({
                campusVisits: campusVisits.data.stats,
                events: events.data.stats,
                conferences: conferences.data.stats,
                partners: partners.data.stats,
                outreach: outreach.data.stats,
                digitalMedia: digitalMedia.data.stats
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    const { campusVisits, events, conferences, partners, outreach, digitalMedia } = allModuleStats;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                <p className="text-base-content/70 mt-2">
                    Welcome back, {user?.name}! Here's your comprehensive overview.
                </p>
            </div>

            {/* Overview Stats Grid */}
            <div className="mb-6">
                <button
                    onClick={() => toggleSection('overview')}
                    className="btn btn-ghost btn-sm gap-2 mb-4"
                >
                    {expandedSections.overview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Overview Statistics
                </button>

                {expandedSections.overview && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatsCard title="Total Partners" value={partners?.total || 0} icon={Users} color="primary" trend={partners?.trend} />
                        <StatsCard title="Total Events" value={events?.total || 0} icon={Calendar} color="secondary" trend={events?.trend} />
                        <StatsCard title="Total Visits" value={campusVisits?.total || 0} icon={Building2} color="info" trend={campusVisits?.trend} />
                        <StatsCard title="Total Outreach" value={outreach?.total || 0} icon={Mail} color="accent" trend={outreach?.trend} />
                    </div>
                )}
            </div>

            {/* Campus Visits Section */}
            <div className="mb-6">
                <button
                    onClick={() => toggleSection('campusVisits')}
                    className="btn btn-ghost btn-sm gap-2 mb-4"
                >
                    {expandedSections.campusVisits ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Campus Visits Analytics
                </button>

                {expandedSections.campusVisits && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <StatsCard title="Total Visits" value={campusVisits?.total || 0} icon={Users} color="primary" />
                            <StatsCard title="Countries" value={campusVisits?.countries || 0} icon={Globe} color="secondary" />
                            <StatsCard title="Universities" value={campusVisits?.universities || 0} icon={Building2} color="info" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DistributionPieChart data={campusVisits?.countryDistribution || []} title="Top 10 Countries" />
                            <DistributionBarChart data={campusVisits?.universityDistribution || []} title="Top 10 Universities" />
                        </div>
                    </div>
                )}
            </div>

            {/* Events Section */}
            <div className="mb-6">
                <button
                    onClick={() => toggleSection('events')}
                    className="btn btn-ghost btn-sm gap-2 mb-4"
                >
                    {expandedSections.events ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Events Analytics
                </button>

                {expandedSections.events && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <StatsCard title="Total Events" value={events?.total || 0} icon={Calendar} color="primary" />
                            <StatsCard title="Event Types" value={events?.eventTypes || 0} icon={Tag} color="secondary" />
                            <StatsCard title="Departments" value={events?.departments || 0} icon={Building2} color="info" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DistributionPieChart data={events?.eventTypeDistribution || []} title="Event Types Distribution" />
                            <DistributionBarChart data={events?.departmentDistribution || []} title="Top 10 Departments" />
                        </div>
                    </div>
                )}
            </div>

            {/* Partners Section */}
            <div className="mb-6">
                <button
                    onClick={() => toggleSection('partners')}
                    className="btn btn-ghost btn-sm gap-2 mb-4"
                >
                    {expandedSections.partners ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Partners Analytics
                </button>

                {expandedSections.partners && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <StatsCard title="Total Partners" value={partners?.total || 0} icon={Users} color="primary" />
                            <StatsCard title="Countries" value={partners?.countries || 0} icon={Globe} color="secondary" />
                            <StatsCard title="Active" value={partners?.active || 0} icon={CheckCircle} color="success" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DistributionPieChart data={partners?.countryDistribution || []} title="Top 10 Countries" />
                            <DistributionPieChart data={partners?.statusDistribution || []} title="Active Status Distribution" />
                        </div>
                    </div>
                )}
            </div>

            {/* Outreach Section */}
            <div className="mb-6">
                <button
                    onClick={() => toggleSection('outreach')}
                    className="btn btn-ghost btn-sm gap-2 mb-4"
                >
                    {expandedSections.outreach ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Outreach Analytics
                </button>

                {expandedSections.outreach && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <StatsCard title="Total Outreach" value={outreach?.total || 0} icon={Mail} color="primary" />
                            <StatsCard title="Responses" value={outreach?.responses || 0} icon={CheckCircle} color="success" />
                            <StatsCard title="No Response" value={outreach?.nonResponses || 0} icon={Mail} color="warning" />
                        </div>
                        <DistributionPieChart data={outreach?.responseDistribution || []} title="Response Rate" />
                    </div>
                )}
            </div>

            {/* Digital Media Section */}
            <div className="mb-6">
                <button
                    onClick={() => toggleSection('digitalMedia')}
                    className="btn btn-ghost btn-sm gap-2 mb-4"
                >
                    {expandedSections.digitalMedia ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Digital Media Analytics
                </button>

                {expandedSections.digitalMedia && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <StatsCard title="Total Media" value={digitalMedia?.total || 0} icon={Radio} color="primary" />
                            <StatsCard title="Channels" value={digitalMedia?.channels || 0} icon={Radio} color="secondary" />
                        </div>
                        <DistributionBarChart data={digitalMedia?.channelDistribution || []} title="Content by Channel" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
