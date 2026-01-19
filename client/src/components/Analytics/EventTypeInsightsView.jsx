import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Tag, Calendar, Users, Building2, TrendingUp } from 'lucide-react';

const EventTypeInsightsView = ({ data }) => {
    const COLORS = {
        primary: 'oklch(var(--p))',
        secondary: 'oklch(var(--s))',
        accent: 'oklch(var(--a))',
        neutral: 'oklch(var(--n))',
        info: 'oklch(var(--in))',
        success: 'oklch(var(--su))',
        warning: 'oklch(var(--wa))'
    };

    const PIE_COLORS = [
        COLORS.primary,
        COLORS.secondary,
        COLORS.accent,
        COLORS.info,
        COLORS.success,
        COLORS.warning
    ];

    // Data safely extracted
    const eventTypeDist = data?.eventTypeDistribution || [];
    const departmentDist = data?.departmentDistribution || [];
    const recentEvents = data?.recentEvents || [];
    const totalTypes = data?.eventTypes || 0;
    const totalEvents = data?.total || 0;

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
                            <Tag className="w-8 h-8 text-primary" />
                            <div>
                                <p className="text-sm text-base-content/70">Total Event Types</p>
                                <p className="text-2xl font-bold">{totalTypes}</p>
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
                            <Calendar className="w-8 h-8 text-secondary" />
                            <div>
                                <p className="text-sm text-base-content/70">Total Events</p>
                                <p className="text-2xl font-bold">{totalEvents}</p>
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
                                <p className="text-sm text-base-content/70">Avg Events/Type</p>
                                <p className="text-2xl font-bold">
                                    {totalTypes > 0 ? (totalEvents / totalTypes).toFixed(1) : 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Event Types Pie Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body">
                        <h3 className="card-title text-lg flex items-center gap-2">
                            <Tag size={20} />
                            Event Distribution by Type
                        </h3>
                        {eventTypeDist.length > 0 ? (
                            <div style={{ minHeight: '350px' }}>
                                <ResponsiveContainer width="100%" height={350}>
                                    <PieChart>
                                        <Pie
                                            data={eventTypeDist}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={120}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {eventTypeDist.map((entry, index) => (
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
                        ) : (
                            <div className="text-center py-8 text-base-content/50">
                                No event type data available
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Top Departments - Progress Bars */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body">
                        <h3 className="card-title text-lg flex items-center gap-2">
                            <Building2 size={20} />
                            Top 10 Departments by Events
                        </h3>
                        {departmentDist.length > 0 ? (
                            <div className="space-y-3 mt-4">
                                {departmentDist.map((dept, index) => {
                                    const maxValue = Math.max(...departmentDist.map(d => d.value));
                                    const percentage = (dept.value / maxValue) * 100;

                                    return (
                                        <div key={index}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium truncate max-w-[70%]" title={dept.name}>
                                                    {dept.name}
                                                </span>
                                                <span className="text-sm font-bold text-primary">{dept.value}</span>
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
                                No department data available
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Recent Events Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="card bg-base-200 shadow-sm"
            >
                <div className="card-body">
                    <h3 className="card-title text-lg flex items-center gap-2">
                        <Calendar size={20} />
                        Recent Events
                    </h3>
                    <div className="overflow-x-auto mt-4">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Department</th>
                                    <th>University/Country</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEvents.map((event, index) => (
                                    <tr key={index}>
                                        <td className="font-medium max-w-xs truncate" title={event.title}>{event.title}</td>
                                        <td>
                                            <span className="badge badge-info badge-sm whitespace-nowrap">
                                                {event.type || '-'}
                                            </span>
                                        </td>
                                        <td>{event.department || '-'}</td>
                                        <td>{event.universityCountry || '-'}</td>
                                        <td>{new Date(event.date).toLocaleDateString()}</td>
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

export default EventTypeInsightsView;
