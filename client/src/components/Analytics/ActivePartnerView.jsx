import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { AlertCircle, Clock, CheckCircle, FileText, ArrowRight } from 'lucide-react';

const ActivePartnerView = ({ data }) => {
    // Colors for different statuses
    const COLORS = {
        upcoming: 'oklch(var(--er))',   // Red for critical
        mediumTerm: 'oklch(var(--wa))', // Yellow for warning
        longTerm: 'oklch(var(--su))',   // Green for good
        neutral: 'oklch(var(--n))',
        primary: 'oklch(var(--p))',
        secondary: 'oklch(var(--s))',
        accent: 'oklch(var(--a))'
    };

    const PIE_COLORS = [
        COLORS.primary,
        COLORS.secondary,
        COLORS.accent,
        COLORS.neutral,
        'oklch(var(--in))'
    ];

    // Data safely extracted
    const expiryData = data?.expiryForecast || { upcoming: 0, mediumTerm: 0, longTerm: 0 };
    const agreementData = data?.agreementTypes || [];
    const avgDuration = data?.avgDurationDays || 0;
    const totalActive = data?.active || 0;

    const chartData = [
        { name: '< 3 Months', value: expiryData.upcoming, color: COLORS.upcoming, label: 'Critical' },
        { name: '3-6 Months', value: expiryData.mediumTerm, color: COLORS.mediumTerm, label: 'Warning' },
        { name: '> 6 Months', value: expiryData.longTerm, color: COLORS.longTerm, label: 'Healthy' }
    ];

    // Calculate years and months for average duration display
    const durationDisplay = useMemo(() => {
        const years = Math.floor(avgDuration / 365);
        const months = Math.floor((avgDuration % 365) / 30);
        return `${years > 0 ? `${years}y ` : ''}${months}m`;
    }, [avgDuration]);

    return (
        <div className="space-y-6">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Expiry Alert Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card bg-base-100 shadow-sm border border-base-200"
                >
                    <div className="card-body p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-error/10 text-error">
                                <AlertCircle size={20} />
                            </div>
                            <h3 className="font-semibold text-base-content/70">Expiring Soon</h3>
                        </div>
                        <div className="text-3xl font-bold text-base-content">
                            {expiryData.upcoming}
                        </div>
                        <p className="text-xs text-base-content/50">Partnerships ending in &lt; 90 days</p>
                    </div>
                </motion.div>

                {/* Avg Duration Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card bg-base-100 shadow-sm border border-base-200"
                >
                    <div className="card-body p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                                <Clock size={20} />
                            </div>
                            <h3 className="font-semibold text-base-content/70">Avg. Duration</h3>
                        </div>
                        <div className="text-3xl font-bold text-base-content">
                            {durationDisplay}
                        </div>
                        <p className="text-xs text-base-content/50">Average active partnership length</p>
                    </div>
                </motion.div>

                {/* Total Active Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card bg-base-100 shadow-sm border border-base-200"
                >
                    <div className="card-body p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-success/10 text-success">
                                <CheckCircle size={20} />
                            </div>
                            <h3 className="font-semibold text-base-content/70">Total Active</h3>
                        </div>
                        <div className="text-3xl font-bold text-base-content">
                            {totalActive}
                        </div>
                        <p className="text-xs text-base-content/50">Currently active partnerships</p>
                    </div>
                </motion.div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Expiry Forecast Chart */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="card bg-base-100 shadow-sm border border-base-200"
                >
                    <div className="card-body">
                        <h3 className="card-title text-base flex justify-between items-center">
                            <span>Expiry Forecast</span>
                            <div className="badge badge-outline text-xs font-normal">Next 6+ Months</div>
                        </h3>

                        <div className="h-[250px] w-full mt-4" style={{ minHeight: '250px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={80}
                                        tick={{ fill: 'oklch(var(--bc))', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{
                                            backgroundColor: 'oklch(var(--b1))',
                                            border: '1px solid oklch(var(--bc) / 0.1)',
                                            borderRadius: '0.5rem'
                                        }}
                                    />
                                    <Bar
                                        dataKey="value"
                                        radius={[0, 4, 4, 0]}
                                        barSize={32}
                                        label={{ position: 'right', fill: 'oklch(var(--bc))', fontSize: 12 }}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs text-base-content/60">
                            <div>Create renewal plan<br />for upcoming</div>
                            <div>Review terms for<br />medium term</div>
                            <div>Stable pipeline<br />long term</div>
                        </div>
                    </div>
                </motion.div>

                {/* Agreement Types Donut */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="card bg-base-100 shadow-sm border border-base-200"
                >
                    <div className="card-body">
                        <h3 className="card-title text-base flex justify-between items-center">
                            <span>Agreement Distribution</span>
                            <FileText size={16} className="text-base-content/40" />
                        </h3>

                        {agreementData.length > 0 ? (
                            <div className="h-[250px] w-full mt-4 flex items-center justify-center" style={{ minHeight: '250px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={agreementData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {agreementData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'oklch(var(--b1))',
                                                border: '1px solid oklch(var(--bc) / 0.1)',
                                                borderRadius: '0.5rem'
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            formatter={(value) => <span className="text-xs text-base-content/70 ml-1">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-base-content/40">
                                No agreement type data
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Expiring Soon List */}
            {data.expiringPartners && data.expiringPartners.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="card bg-base-100 shadow-sm border border-base-200"
                >
                    <div className="card-body">
                        <h3 className="card-title text-base flex items-center gap-2">
                            <Clock size={16} className="text-warning" />
                            <span>Approaching Expiry</span>
                        </h3>

                        <div className="overflow-x-auto mt-2">
                            <table className="table table-sm w-full">
                                <thead>
                                    <tr>
                                        <th>Partner Institution</th>
                                        <th>Country</th>
                                        <th>Type</th>
                                        <th>Expires In</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.expiringPartners.map((partner, index) => {
                                        const daysLeft = Math.ceil((new Date(partner.expiringDate) - new Date()) / (1000 * 60 * 60 * 24));
                                        const isCritical = daysLeft < 90;
                                        return (
                                            <tr key={index} className="hover:bg-base-200/50">
                                                <td className="font-medium">{partner.partnerName || 'Unknown Partner'}</td>
                                                <td>{partner.country}</td>
                                                <td>
                                                    <span className="badge badge-sm badge-ghost">{partner.agreementType}</span>
                                                </td>
                                                <td>
                                                    <span className={`badge badge-sm ${isCritical ? 'badge-error text-white' : 'badge-warning'}`}>
                                                        {new Date(partner.expiringDate).toLocaleDateString()}
                                                        <span className="opacity-70 ml-1">({daysLeft} days)</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default ActivePartnerView;
