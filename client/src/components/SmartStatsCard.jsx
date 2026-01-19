import StatsCard from './StatsCard';
import { useAnalytics } from '../context/AnalyticsContext';

const SmartStatsCard = ({
    title,
    value,
    icon,
    color,
    trend,
    moduleType,
    statType,
    moduleData,
    ...rest
}) => {
    const { openAnalytics } = useAnalytics();

    const handleClick = () => {
        console.log('SmartStatsCard clicked!', { title, moduleType, statType });

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

        console.log('Opening analytics with data:', analyticsData);
        openAnalytics(analyticsData);
    };

    return (
        <StatsCard
            title={title}
            value={value}
            icon={icon}
            color={color}
            trend={trend}
            onClick={handleClick}
            {...rest}
        />
    );
};

export default SmartStatsCard;
