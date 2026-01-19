import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { X, TrendingUp, Globe, BarChart3, Download, FileText, File, Table } from 'lucide-react';
import { useAnalytics } from '../../context/AnalyticsContext';
import { exportToPDF, exportToExcel, exportToCSV } from '../../utils/exportUtils';
import toast from 'react-hot-toast';
import StatsOverview from './StatsOverview';
import TrendChart from './TrendChart';
import GeographicView from './GeographicView';

const AnalyticsModal = () => {
    const { isOpen, closeAnalytics, analyticsData, activeTab, setActiveTab } = useAnalytics();

    console.log('AnalyticsModal render:', { isOpen, hasData: !!analyticsData });

    // Handle ESC key press
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                console.log('ESC key pressed, closing modal');
                closeAnalytics();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeAnalytics]);

    if (!analyticsData) {
        console.log('AnalyticsModal: No data, not rendering modal');
        return null;
    }

    const handleBackdropClick = (e) => {
        // Only close if clicking directly on backdrop, not bubbled events
        if (e.target === e.currentTarget) {
            console.log('Backdrop clicked, closing modal');
            closeAnalytics();
        } else {
            console.log('Click on modal content, not closing');
        }
    };

    const handleExport = async (format) => {
        try {
            toast.loading(`Exporting to ${format.toUpperCase()}...`, { id: 'export' });

            switch (format) {
                case 'pdf':
                    await exportToPDF(analyticsData);
                    break;
                case 'excel':
                    exportToExcel(analyticsData);
                    break;
                case 'csv':
                    exportToCSV(analyticsData);
                    break;
                default:
                    throw new Error('Unknown format');
            }

            toast.success(`Exported successfully!`, { id: 'export' });
        } catch (error) {
            console.error('Export error:', error);
            toast.error(`Export failed: ${error.message}`, { id: 'export' });
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
                            <div className="flex items-center gap-2">
                                {/* Export Dropdown */}
                                <div className="dropdown dropdown-end">
                                    <label tabIndex={0} className="btn btn-ghost btn-sm gap-2">
                                        <Download size={18} />
                                        <span className="hidden sm:inline">Export</span>
                                    </label>
                                    <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300">
                                        <li>
                                            <button onClick={() => handleExport('pdf')} className="gap-2">
                                                <FileText size={16} />
                                                Export as PDF
                                            </button>
                                        </li>
                                        <li>
                                            <button onClick={() => handleExport('excel')} className="gap-2">
                                                <File size={16} />
                                                Export as Excel
                                            </button>
                                        </li>
                                        <li>
                                            <button onClick={() => handleExport('csv')} className="gap-2">
                                                <Table size={16} />
                                                Export as CSV
                                            </button>
                                        </li>
                                    </ul>
                                </div>

                                <button
                                    onClick={closeAnalytics}
                                    className="btn btn-ghost btn-sm btn-circle"
                                    aria-label="Close analytics"
                                >
                                    <X size={20} />
                                </button>
                            </div>
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
