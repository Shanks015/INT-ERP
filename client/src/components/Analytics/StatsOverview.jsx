import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { TrendingUp, TrendingDown, Users, Globe, CheckCircle, Activity } from 'lucide-react';

const StatsOverview = ({ data }) => {
    const quickStats = [
        {
            label: 'Total Records',
            value: data.total || 0,
            icon: Users,
            color: 'primary',
            change: data.trend?.change
        },
        {
            label: 'Active',
            value: data.active || 0,
            icon: CheckCircle,
            color: 'success'
        },
        {
            label: 'Countries/Regions',
            value: data.countries || data.universities || 0,
            icon: Globe,
            color: 'info'
        },
        {
            label: 'Growth Rate',
            value: data.trend?.percentage || 0,
            icon: Activity,
            color: 'secondary',
            suffix: '%'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickStats.map((stat, index) => {
                    const Icon = stat.icon;
                    const isPositive = (stat.change || stat.value) >= 0;

                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`card bg-base-200 shadow-sm hover:shadow-md transition-shadow`}
                        >
                            <div className="card-body p-4">
                                <div className="flex items-center justify-between">
                                    <Icon className={`w-8 h-8 text-${stat.color}`} />
                                    {stat.change !== undefined && (
                                        isPositive ?
                                            <TrendingUp className="w-5 h-5 text-success" /> :
                                            <TrendingDown className="w-5 h-5 text-error" />
                                    )}
                                </div>
                                <div className="mt-2">
                                    <div className={`text-3xl font-bold text-${stat.color}`}>
                                        <CountUp
                                            end={stat.value}
                                            duration={1.5}
                                            separator=","
                                            suffix={stat.suffix || ''}
                                        />
                                    </div>
                                    <div className="text-sm text-base-content/70 mt-1">
                                        {stat.label}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Distribution Preview */}
            {data.countryDistribution && data.countryDistribution.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body">
                        <h3 className="card-title text-lg">Top Regions</h3>
                        <div className="space-y-3 mt-4">
                            {data.countryDistribution.slice(0, 5).map((item, index) => {
                                const percentage = ((item.value / data.total) * 100).toFixed(1);
                                return (
                                    <div key={item.name} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{item.name}</span>
                                            <span className="text-base-content/70">
                                                {item.value} ({percentage}%)
                                            </span>
                                        </div>
                                        <motion.div
                                            className="h-2 bg-base-300 rounded-full overflow-hidden"
                                            initial={{ width: 0 }}
                                            animate={{ width: '100%' }}
                                            transition={{ delay: 0.5 + index * 0.1 }}
                                        >
                                            <motion.div
                                                className="h-full bg-primary rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ delay: 0.6 + index * 0.1, duration: 0.8 }}
                                            />
                                        </motion.div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default StatsOverview;
