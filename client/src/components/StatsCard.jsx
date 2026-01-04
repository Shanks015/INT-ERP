import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StatsCard = ({
    title,
    value,
    icon: Icon,
    trend,
    color = 'primary',
    onClick,
    isActive = false
}) => {
    const trendIcons = {
        up: <TrendingUp className="w-4 h-4" />,
        down: <TrendingDown className="w-4 h-4" />,
        stable: <Minus className="w-4 h-4" />
    };

    const trendColors = {
        up: 'text-success',
        down: 'text-error',
        stable: 'text-base-content/50'
    };

    return (
        <div
            className={`stats shadow w-full ${onClick ? 'cursor-pointer hover:shadow-lg transition-all' : ''} ${isActive ? 'ring-2 ring-primary' : ''}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            <div className="stat">
                <div className={`stat-figure text-${color}`}>
                    {Icon && <Icon className="w-6 h-6 sm:w-8 sm:h-8" />}
                </div>
                <div className="stat-title text-xs sm:text-sm truncate">{title}</div>
                <div className={`stat-value text-${color} text-xl sm:text-2xl md:text-3xl`}>{value || 0}</div>

                {trend && (
                    <div className={`stat-desc flex items-center gap-1 ${trendColors[trend.direction]} flex-wrap`}>
                        {trendIcons[trend.direction]}
                        <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                            {trend.change > 0 ? '+' : ''}{trend.change} ({trend.percentage}%)
                        </span>
                        <span className="text-base-content/50 text-xs">vs last month</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatsCard;
