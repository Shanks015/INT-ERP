import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Globe, BarChart3 } from 'lucide-react';
import { useAnalytics } from '../../context/AnalyticsContext';
import StatsOverview from './StatsOverview';
import TrendChart from './TrendChart';
import GeographicView from './GeographicView';

const AnalyticsModal = () => {
    const { isOpen, closeAnalytics, analyticsData, activeTab, setActiveTab } = useAnalytics();

    if (!analyticsData) return null;

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
                        onClick={closeAnalytics}
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
                                    {analyticsData.title} Analytics
                                </h2>
                                <p className="text-sm text-base-content/70 mt-1">
                                    Detailed insights and trends
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

                        {/* Tabs */}
                        <div className="tabs tabs-boxed bg-base-200 p-2 mx-4 md:mx-6 mt-4">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        className={`tab gap-2 ${activeTab === tab.id ? 'tab-active' : ''}`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        <Icon size={16} />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {activeTab === 'overview' && <StatsOverview data={analyticsData} />}
                                    {activeTab === 'trends' && <TrendChart data={analyticsData} />}
                                    {activeTab === 'geographic' && <GeographicView data={analyticsData} />}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AnalyticsModal;
