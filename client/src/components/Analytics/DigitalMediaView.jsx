import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, DollarSign, Hash, Calendar } from 'lucide-react';

const DigitalMediaView = ({ data }) => {
    const channelDistribution = data.channelDistribution || [];
    const totalPosts = data.total || 0;
    const channels = data.channels || 0;

    // Colors for pie chart
    const COLORS = [
        'oklch(var(--p))',
        'oklch(var(--s))',
        'oklch(var(--a))',
        'oklch(var(--su))',
        'oklch(var(--wa))',
        'oklch(var(--er))',
        'oklch(var(--in))'
    ];

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body p-4">
                        <div className="flex items-center justify-between">
                            <Hash className="w-8 h-8 text-primary" />
                            <div className="stat-value text-primary text-2xl">{totalPosts}</div>
                        </div>
                        <div className="stat-title mt-2">Total Posts</div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body p-4">
                        <div className="flex items-center justify-between">
                            <TrendingUp className="w-8 h-8 text-secondary" />
                            <div className="stat-value text-secondary text-2xl">{channels}</div>
                        </div>
                        <div className="stat-title mt-2">Active Channels</div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body p-4">
                        <div className="flex items-center justify-between">
                            <Calendar className="w-8 h-8 text-accent" />
                            <div className="stat-value text-accent text-2xl">
                                {data.trend?.percentage >= 0 ? '+' : ''}{data.trend?.percentage || 0}%
                            </div>
                        </div>
                        <div className="stat-title mt-2">Growth Rate</div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body p-4">
                        <div className="flex items-center justify-between">
                            <DollarSign className="w-8 h-8 text-success" />
                            <div className="stat-value text-success text-xl">Coverage</div>
                        </div>
                        <div className="stat-title mt-2">Media Reach</div>
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Channel Distribution - Pie Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body">
                        <h3 className="card-title text-lg">Channel Distribution</h3>
                        {channelDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={channelDistribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {channelDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'oklch(var(--b1))',
                                            border: '1px solid oklch(var(--bc) / 0.2)',
                                            borderRadius: '0.5rem'
                                        }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-base-content/50">
                                No channel distribution data available
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Channel Distribution - Bar Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body">
                        <h3 className="card-title text-lg">Posts by Channel</h3>
                        {channelDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={channelDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--bc) / 0.1)" vertical={false} />
                                    <XAxis
                                        dataKey="name"
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
                                            border: '1px solid oklch(var(--bc) / 0.2)',
                                            borderRadius: '0.5rem'
                                        }}
                                    />
                                    <Bar dataKey="value" fill="oklch(var(--p))" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-base-content/50">
                                No posts data available
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Channel Breakdown List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="card bg-base-200 shadow-sm"
            >
                <div className="card-body">
                    <h3 className="card-title text-lg mb-4">Channel Breakdown</h3>
                    {channelDistribution.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Channel</th>
                                        <th>Posts</th>
                                        <th>Percentage</th>
                                        <th>Visual</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {channelDistribution.map((channel, index) => {
                                        const percentage = ((channel.value / totalPosts) * 100).toFixed(1);
                                        return (
                                            <tr key={index}>
                                                <td className="font-semibold">{channel.name}</td>
                                                <td>{channel.value}</td>
                                                <td>{percentage}%</td>
                                                <td>
                                                    <progress
                                                        className="progress progress-primary w-32"
                                                        value={percentage}
                                                        max="100"
                                                    ></progress>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-base-content/50">
                            No channel data available
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Insights */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="card bg-info/10 shadow-sm"
            >
                <div className="card-body">
                    <h3 className="card-title text-lg text-info">📊 Digital Media Insights</h3>
                    <div className="space-y-2">
                        <p className="text-sm">
                            <strong>Total Coverage:</strong> {totalPosts} articles across {channels} channels
                        </p>
                        {channelDistribution.length > 0 && (
                            <p className="text-sm">
                                <strong>Top Channel:</strong> {channelDistribution[0].name} with {channelDistribution[0].value} posts
                                ({((channelDistribution[0].value / totalPosts) * 100).toFixed(1)}% of total)
                            </p>
                        )}
                        <p className="text-sm">
                            <strong>Growth Trend:</strong> {data.trend?.change >= 0 ? 'Positive' : 'Negative'} with{' '}
                            {data.trend?.change >= 0 ? '+' : ''}{data.trend?.change || 0} posts this month
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default DigitalMediaView;
