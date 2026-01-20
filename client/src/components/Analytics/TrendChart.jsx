import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const TrendChart = ({ data }) => {
    // Check if we have real trend data from backend
    const hasTrendData = data.trendData && Array.isArray(data.trendData) && data.trendData.length > 0;

    // If no real trend data, show informative message
    if (!hasTrendData) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card bg-base-200 shadow-sm"
            >
                <div className="card-body">
                    <h3 className="card-title text-lg">Growth Trend</h3>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="text-6xl mb-4">📊</div>
                        <h4 className="text-lg font-semibold mb-2">Trend Data Coming Soon</h4>
                        <p className="text-base-content/60 max-w-md">
                            Historical trend data will be available once you have activity over multiple months.
                            Currently showing growth rate: <span className="font-bold text-primary">{data.trend?.percentage || 0}%</span>
                        </p>
                        <div className="stats shadow mt-4">
                            <div className="stat place-items-center">
                                <div className="stat-title">Current Month Growth</div>
                                <div className={`stat-value text-2xl ${(data.trend?.percentage || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                                    {(data.trend?.percentage || 0) >= 0 ? '+' : ''}{data.trend?.percentage || 0}%
                                </div>
                                <div className="stat-desc">
                                    {data.trend?.change >= 0 ? '+' : ''}{data.trend?.change || 0} from last month
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    const trendData = data.trendData;

    return (
        <div className="space-y-6">
            {/* Growth Trend */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card bg-base-200 shadow-sm"
            >
                <div className="card-body">
                    <h3 className="card-title text-lg">Growth Trend (Last 12 Months)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="oklch(var(--p))" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="oklch(var(--p))" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="oklch(var(--s))" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="oklch(var(--s))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--bc) / 0.1)" vertical={false} />
                            <XAxis
                                dataKey="month"
                                stroke="oklch(var(--bc))"
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis
                                stroke="oklch(var(--bc))"
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'oklch(var(--b1))',
                                    border: '1px solid oklch(var(--bc) / 0.1)',
                                    borderRadius: '0.5rem'
                                }}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="current"
                                stroke="oklch(var(--p))"
                                fillOpacity={1}
                                fill="url(#colorCurrent)"
                                strokeWidth={2}
                                name="Current Year"
                            />
                            <Area
                                type="monotone"
                                dataKey="previous"
                                stroke="oklch(var(--s))"
                                fillOpacity={1}
                                fill="url(#colorPrevious))"
                                strokeWidth={2}
                                name="Previous Year"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </div>
    );
};

export default TrendChart;
