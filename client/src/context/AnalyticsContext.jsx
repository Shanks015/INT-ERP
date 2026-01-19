import { createContext, useContext, useState } from 'react';

const AnalyticsContext = createContext();

export const useAnalytics = () => {
    const context = useContext(AnalyticsContext);
    if (!context) {
        throw new Error('useAnalytics must be used within AnalyticsProvider');
    }
    return context;
};

export const AnalyticsProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    const openAnalytics = (data) => {
        console.log('AnalyticsContext: openAnalytics called with:', data);
        setAnalyticsData(data);

        // Set smart default tab based on statType
        const defaultTab = getDefaultTab(data.statType);
        setActiveTab(defaultTab);

        setIsOpen(true);
        console.log('AnalyticsContext: Modal should be open now');
    };

    const getDefaultTab = (statType) => {
        // Smart defaults based on what was clicked
        switch (statType) {
            case 'countries':
            case 'universities':
            case 'departments':
                return 'geographic'; // Geographic data → Geographic tab
            case 'total':
            case 'active':
            case 'responses':
            case 'non-responses':
                return 'overview'; // Counts → Overview tab
            case 'types':
            case 'channels':
                return 'trends'; // Categories → Trends tab
            default:
                return 'overview';
        }
    };

    const closeAnalytics = () => {
        console.log('AnalyticsContext: closeAnalytics called');
        setIsOpen(false);
        setActiveTab('overview');
        setTimeout(() => setAnalyticsData(null), 300); // Clear after animation
    };

    const value = {
        isOpen,
        analyticsData,
        activeTab,
        setActiveTab,
        openAnalytics,
        closeAnalytics
    };

    return (
        <AnalyticsContext.Provider value={value}>
            {children}
        </AnalyticsContext.Provider>
    );
};
