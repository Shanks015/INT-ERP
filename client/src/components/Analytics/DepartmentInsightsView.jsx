import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2, GraduationCap, Users, TrendingUp, Calendar, Award } from 'lucide-react';

const DepartmentInsightsView = ({ data }) => {
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
        COLORS.success
    ];

    // Data safely extracted
    const departmentDist = data?.departmentDistribution || [];
    const categoryDist = data?.categoryDistribution || [];
    const activeScholars = data?.activeScholars || [];
    const recentScholars = data?.recentScholars || [];
    const totalDepartments = data?.departments || 0;
    const totalScholars = data?.total || 0;

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
                                <p className="text-sm text-base-content/70">Total Departments</p>
                                <p className="text-2xl font-bold">{totalDepartments}</p>
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
                            <GraduationCap className="w-8 h-8 text-secondary" />
                            <div>
                                <p className="text-sm text-base-content/70">Total Scholars</p>
                                <p className="text-2xl font-bold">{totalScholars}</p>
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
                                <p className="text-sm text-base-content/70">Avg Scholars/Dept</p>
                                <p className="text-2xl font-bold">
                                    {totalDepartments > 0 ? (totalScholars / totalDepartments).toFixed(1) : 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Departments - Custom Progress Bars */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body">
                        <h3 className="card-title text-lg flex items-center gap-2">
                            <Building2 size={20} />
                            Top 10 Departments by Scholars
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

                {/* Scholar Categories Pie Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body">
                        <h3 className="card-title text-lg flex items-center gap-2">
                            <Award size={20} />
                            Scholar Categories
                        </h3>
                        {categoryDist.length > 0 ? (
                            <div style={{ minHeight: '300px' }}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={categoryDist}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {categoryDist.map((entry, index) => (
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
                                No category data available
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Active vs Expired Status */}
            {activeScholars.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body">
                        <h3 className="card-title text-lg">Scholar Status Distribution</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            {activeScholars.map((status, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
                                    <div>
                                        <p className="text-sm text-base-content/70 capitalize">{status.name}</p>
                                        <p className="text-2xl font-bold mt-1">{status.value}</p>
                                    </div>
                                    <span className={`badge ${status.name === 'active' ? 'badge-success' : 'badge-error'} badge-lg whitespace-nowrap`}>
                                        {status.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Recent Scholars Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="card bg-base-200 shadow-sm"
            >
                <div className="card-body">
                    <h3 className="card-title text-lg flex items-center gap-2">
                        <Calendar size={20} />
                        Recent Scholars
                    </h3>
                    <div className="overflow-x-auto mt-4">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>Scholar Name</th>
                                    <th>Country</th>
                                    <th>University</th>
                                    <th>Department</th>
                                    <th>From Date</th>
                                    <th>To Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentScholars.map((scholar, index) => (
                                    <tr key={index}>
                                        <td className="font-medium">{scholar.scholarName}</td>
                                        <td>{scholar.country}</td>
                                        <td>{scholar.university || '-'}</td>
                                        <td>{scholar.department || '-'}</td>
                                        <td>{new Date(scholar.fromDate).toLocaleDateString()}</td>
                                        <td>{new Date(scholar.toDate).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`badge ${scholar.recordStatus === 'active' ? 'badge-success' : 'badge-error'} badge-sm whitespace-nowrap`}>
                                                {scholar.recordStatus}
                                            </span>
                                        </td>
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

export default DepartmentInsightsView;
