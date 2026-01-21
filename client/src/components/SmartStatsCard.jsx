import React from 'react';
import StatsCard from './StatsCard';
import { useAnalytics } from '../context/AnalyticsContext';

const SmartStatsCard = React.memo(({
    title,
    value,
    icon,
    color,
    trend,
    moduleType,
    statType,
    moduleData,
    loading,
    ...rest
}) => {
    const { openAnalytics } = useAnalytics();

    const handleClick = () => {
        // console.log('SmartStatsCard clicked!', { title, moduleType, statType }); // cleanup debug log

        // Prepare analytics data
        const analyticsData = {
            title,
            value,
            icon,
            moduleType,
            statType,
            trend,
            ...moduleData
        };

        // console.log('Opening analytics with data:', analyticsData);
        openAnalytics(analyticsData);
    };

    return (
        <StatsCard
            title={title}
            value={value}
            icon={icon}
            color={color}
            trend={trend}
            loading={loading}
            onClick={handleClick}
            {...rest}
        />
    );
});

SmartStatsCard.displayName = 'SmartStatsCard';

export default SmartStatsCard;
