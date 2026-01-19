import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const TrendChart = ({ data }) => {
    console.log('TrendChart received data:', data);

    // Generate mock trend data (replace with real backend data later)
    const generateTrendData = () => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        console.log('Current month:', currentMonth);

        const baseValue = data.total ? Math.floor(data.total / 12) : 10;

        // For now, always show first 6 months for consistency
        const displayMonths = months.slice(0, 6);
        console.log('Display months:', displayMonths);

        const result = displayMonths.map((month, index) => ({
            month,
            current: Math.floor(Math.random() * 20) + baseValue + index * 2,
            previous: Math.floor(Math.random() * 15) + Math.max(1, baseValue - 5) + index
        }));

        console.log('Generated result:', result);
        return result;
    };

    const trendData = data.trendData || generateTrendData();
    console.log('Trend data being used:', trendData, 'Length:', trendData.length);

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
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 12, fill: 'oklch(var(--bc))' }}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: 'oklch(var(--bc))' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'oklch(var(--b1))',
                                    border: '1px solid oklch(var(--bc) / 0.2)',
                                    borderRadius: '0.5rem',
                                    color: 'oklch(var(--bc))'
                                }}
                                labelStyle={{ color: 'oklch(var(--bc))' }}
                                itemStyle={{ color: 'oklch(var(--bc))' }}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: '14px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="current"
                                stroke="oklch(var(--p))"
                                fillOpacity={1}
                                fill="url(#colorCurrent)"
                                name="This Year"
                            />
                            <Area
                                type="monotone"
                                dataKey="previous"
                                stroke="oklch(var(--s))"
                                fillOpacity={1}
                                fill="url(#colorPrevious)"
                                name="Last Year"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Monthly Comparison */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card bg-base-200 shadow-sm"
            >
                <div className="card-body">
                    <h3 className="card-title text-lg">Month-over-Month Comparison</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 12, fill: 'oklch(var(--bc))' }}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: 'oklch(var(--bc))' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'oklch(var(--b1))',
                                    border: '1px solid oklch(var(--bc) / 0.2)',
                                    borderRadius: '0.5rem',
                                    color: 'oklch(var(--bc))'
                                }}
                                labelStyle={{ color: 'oklch(var(--bc))' }}
                                itemStyle={{ color: 'oklch(var(--bc))' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '14px' }} />
                            <Line
                                type="monotone"
                                dataKey="current"
                                stroke="oklch(var(--p))"
                                strokeWidth={3}
                                dot={{ fill: 'oklch(var(--p))', r: 4 }}
                                name="This Year"
                            />
                            <Line
                                type="monotone"
                                dataKey="previous"
                                stroke="oklch(var(--s))"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ fill: 'oklch(var(--s))', r: 3 }}
                                name="Last Year"
                            />
                        </LineChart>
                    </ResponsiveContainer>

                    {/* Insights */}
                    <div className="mt-4 p-4 bg-info/10 rounded-lg">
                        <p className="text-sm">
                            <strong className="text-info">💡 Insight:</strong> {
                                data.trend?.change > 0
                                    ? `You're on track for ${data.trend.percentage}% growth this period.`
                                    : data.trend?.change < 0
                                        ? `Activity has decreased by ${Math.abs(data.trend.percentage)}%. Consider reviewing your strategies.`
                                        : 'Activity is stable compared to last period.'
                            }
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default TrendChart;
