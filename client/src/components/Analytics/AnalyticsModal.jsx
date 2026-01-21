import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { X, TrendingUp, Globe, BarChart3 } from 'lucide-react';
import { useAnalytics } from '../../context/AnalyticsContext';
import StatsOverview from './StatsOverview';
import TrendChart from './TrendChart';
import GeographicView from './GeographicView';
import ActivePartnerView from './ActivePartnerView';
import UniversityInsightsView from './UniversityInsightsView';
import DepartmentInsightsView from './DepartmentInsightsView';
import EventTypeInsightsView from './EventTypeInsightsView';
import OutreachView from './OutreachView';
import DigitalMediaView from './DigitalMediaView';

const AnalyticsModal = () => {
    const { isOpen, closeAnalytics, analyticsData, activeTab, setActiveTab } = useAnalytics();



    // Handle ESC key press
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeAnalytics();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeAnalytics]);

    if (!analyticsData) {
        return null;
    }

    const handleBackdropClick = (e) => {
        // Only close if clicking directly on backdrop, not bubbled events
        if (e.target === e.currentTarget) {
            closeAnalytics();
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'trends', label: 'Trends', icon: TrendingUp },
        { id: 'geographic', label: 'Geographic', icon: Globe }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={handleBackdropClick}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-4 md:inset-8 bg-base-100 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 md:p-6 border-b border-base-300">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                                    {analyticsData.icon && <analyticsData.icon className="w-8 h-8" />}
                                    {analyticsData.title}
                                    {analyticsData.statType === 'countries' && ' by Country'}
                                    {analyticsData.statType === 'universities' && ' by University'}
                                    {analyticsData.statType === 'departments' && ' by Department'}
                                    {analyticsData.statType === 'types' && ' by Type'}
                                    {analyticsData.statType === 'channels' && ' by Channel'}
                                </h2>
                                <p className="text-sm text-base-content/70 mt-1">
                                    {analyticsData.statType === 'countries' ? 'Geographic distribution and insights' :
                                        analyticsData.statType === 'total' ? 'Overall statistics and trends' :
                                            analyticsData.statType === 'active' ? 'Active records analysis' :
                                                'Detailed insights and trends'}
                                </p>
                            </div>
                            <button
                                onClick={closeAnalytics}
                                className="btn btn-ghost btn-sm btn-circle"
                                aria-label="Close analytics"
                            >
                                <X size={20} />
                            </button>
                        </div>


                        <div className="flex-1 overflow-y-auto p-4 md:p-6">
                            {(() => {
                                const statType = analyticsData?.statType;
                                const moduleType = analyticsData?.moduleType;

                                // Dedicated view for each stat type
                                if (moduleType === 'outreach') {
                                    // Outreach gets its custom view for all stat types
                                    return <OutreachView data={analyticsData} />;
                                } else if (moduleType === 'digital-media') {
                                    // Digital Media gets its custom view for all stat types
                                    return <DigitalMediaView data={analyticsData} />;
                                } else if (statType === 'active') {
                                    return <ActivePartnerView data={analyticsData} />;
                                } else if (statType === 'universities' && moduleType === 'campus-visits') {
                                    // Campus Visits Universities gets dedicated dashboard
                                    return <UniversityInsightsView data={analyticsData} />;
                                } else if (statType === 'departments' && moduleType === 'scholars') {
                                    // Scholars Departments gets dedicated dashboard
                                    return <DepartmentInsightsView data={analyticsData} />;
                                } else if ((statType === 'types' || statType === 'departments') && moduleType === 'events') {
                                    // Events Types and Departments get dedicated dashboard
                                    return <EventTypeInsightsView data={analyticsData} />;
                                } else if (statType === 'countries') {
                                    // Countries shows geographic view with world map
                                    return <GeographicView data={analyticsData} />;
                                } else if (statType === 'universities' || statType === 'departments') {
                                    // Other modules' universities/departments show geographic view or overview
                                    return <GeographicView data={analyticsData} />;
                                } else if (statType === 'total') {
                                    // Total shows Overview + Trends
                                    return (
                                        <div className="space-y-6">
                                            <StatsOverview data={analyticsData} />
                                            <TrendChart data={analyticsData} />
                                        </div>
                                    );
                                } else {
                                    // Other stats show Overview only
                                    return <StatsOverview data={analyticsData} />;
                                }
                            })()}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AnalyticsModal;
