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
        setAnalyticsData(data);
        setIsOpen(true);
    };

    const closeAnalytics = () => {
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
