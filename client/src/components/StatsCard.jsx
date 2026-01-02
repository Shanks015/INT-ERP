const StatsCard = ({ title, value, icon: Icon, trend, color = 'primary' }) => {
    return (
        <div className="stats shadow">
            <div className="stat">
                <div className={`stat-figure text-${color}`}>
                    {Icon && <Icon size={32} />}
                </div>
                <div className="stat-title">{title}</div>
                <div className="stat-value">{value || 0}</div>
                {trend && <div className="stat-desc">{trend}</div>}
            </div>
        </div>
    );
};

export default StatsCard;
