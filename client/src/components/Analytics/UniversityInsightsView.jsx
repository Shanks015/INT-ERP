import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2, Globe, Users, TrendingUp, Calendar } from 'lucide-react';

const UniversityInsightsView = ({ data }) => {
    const COLORS = {
        primary: 'oklch(var(--p))',
        secondary: 'oklch(var(--s))',
        accent: 'oklch(var(--a))',
        neutral: 'oklch(var(--n))',
        info: 'oklch(var(--in))'
    };

    const PIE_COLORS = [
        COLORS.primary,
        COLORS.secondary,
        COLORS.accent,
        COLORS.neutral,
        COLORS.info
    ];

    // Data safely extracted
    const universityDist = data?.universityDistribution || [];
    const purposeDist = data?.purposeDistribution || [];
    const typeDist = data?.typeDistribution || [];
    const recentVisits = data?.recentVisits || [];
    const totalUniversities = data?.universities || 0;
    const totalVisits = data?.total || 0;

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                >
                    <div className="card-body">
                        <div className="flex items-center gap-3">
                            <Building2 className="w-8 h-8 text-primary" />
                            <div>
                                <p className="text-sm text-base-content/70">Total Universities</p>
                                <p className="text-2xl font-bold">{totalUniversities}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20"
                >
                    <div className="card-body">
                        <div className="flex items-center gap-3">
                            <Users className="w-8 h-8 text-secondary" />
                            <div>
                                <p className="text-sm text-base-content/70">Total Visits</p>
                                <p className="text-2xl font-bold">{totalVisits}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20"
                >
                    <div className="card-body">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-8 h-8 text-accent" />
                            <div>
                                <p className="text-sm text-base-content/70">Avg Visits/University</p>
                                <p className="text-2xl font-bold">
                                    {totalUniversities > 0 ? (totalVisits / totalUniversities).toFixed(1) : 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Universities - Custom Progress Bars */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body">
                        <h3 className="card-title text-lg flex items-center gap-2">
                            <Building2 size={20} />
                            Top 10 Universities by Visits
                        </h3>
                        {universityDist.length > 0 ? (
                            <div className="space-y-3 mt-4">
                                {universityDist.map((uni, index) => {
                                    const maxValue = Math.max(...universityDist.map(u => u.value));
                                    const percentage = (uni.value / maxValue) * 100;

                                    return (
                                        <div key={index}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium truncate max-w-[70%]" title={uni.name}>
                                                    {uni.name}
                                                </span>
                                                <span className="text-sm font-bold text-primary">{uni.value}</span>
                                            </div>
                                            <div className="h-6 bg-base-300 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ delay: 0.3 + index * 0.05, duration: 0.5 }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-base-content/50">
                                No university data available
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Visit Types Pie Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body">
                        <h3 className="card-title text-lg flex items-center gap-2">
                            <Globe size={20} />
                            Visit Type Distribution
                        </h3>
                        <div style={{ minHeight: '300px' }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={typeDist}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {typeDist.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'oklch(var(--b1))',
                                            border: '1px solid oklch(var(--bc) / 0.2)',
                                            borderRadius: '0.5rem'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Purpose Distribution */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="card bg-base-200 shadow-sm"
            >
                <div className="card-body">
                    <h3 className="card-title text-lg">Visit Purposes</h3>
                    {purposeDist.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {purposeDist.map((purpose, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                                    <span className="text-sm font-medium">{purpose.name}</span>
                                    <span className="badge badge-primary">{purpose.value}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-base-content/50">
                            No purpose data available
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Recent Visits Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="card bg-base-200 shadow-sm"
            >
                <div className="card-body">
                    <h3 className="card-title text-lg flex items-center gap-2">
                        <Calendar size={20} />
                        Recent Visits
                    </h3>
                    <div className="overflow-x-auto mt-4">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>University</th>
                                    <th>Country</th>
                                    <th>Visitor</th>
                                    <th>Type</th>
                                    <th>Purpose</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentVisits.map((visit, index) => (
                                    <tr key={index}>
                                        <td className="font-medium">{visit.universityName}</td>
                                        <td>{visit.country}</td>
                                        <td>{visit.visitorName || '-'}</td>
                                        <td>
                                            <span className="badge badge-info badge-sm">
                                                {visit.type || '-'}
                                            </span>
                                        </td>
                                        <td className="max-w-xs truncate" title={visit.purpose}>
                                            {visit.purpose || '-'}
                                        </td>
                                        <td>{new Date(visit.date).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default UniversityInsightsView;
