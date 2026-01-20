import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Mail, Globe, Building2, MessageSquare, CheckCircle, XCircle } from 'lucide-react';

const OutreachView = ({ data }) => {
    // Colors
    const COLORS = {
        primary: 'oklch(var(--p))',
        secondary: 'oklch(var(--s))',
        accent: 'oklch(var(--a))',
        success: 'oklch(var(--su))',
        error: 'oklch(var(--er))',
        neutral: 'oklch(var(--n))'
    };

    const PIE_COLORS = [
        COLORS.primary,
        COLORS.secondary,
        COLORS.accent,
        COLORS.neutral,
        'oklch(var(--in))'
    ];

    // Data extraction
    const partnerData = data?.partnerDistribution || [];
    const emailData = data?.emailDomainDistribution || [];
    const countryData = data?.countryDistribution || [];
    const responseData = data?.responseDistribution || [];
    const totalOutreach = data?.total || 0;
    const responded = data?.responses || 0;
    const noResponse = data?.nonResponses || 0;

    return (
        <div className="space-y-6">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Outreach */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card bg-base-100 shadow-sm border border-base-300"
                >
                    <div className="card-body p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Mail size={20} />
                            </div>
                            <h3 className="font-semibold text-base-content/70">Total Outreach</h3>
                        </div>
                        <div className="text-3xl font-bold text-base-content">
                            {totalOutreach}
                        </div>
                        <p className="text-xs text-base-content/50">Contact attempts made</p>
                    </div>
                </motion.div>

                {/* Responded */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card bg-base-100 shadow-sm border border-base-300"
                >
                    <div className="card-body p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-success/10 text-success">
                                <CheckCircle size={20} />
                            </div>
                            <h3 className="font-semibold text-base-content/70">Responded</h3>
                        </div>
                        <div className="text-3xl font-bold text-base-content">
                            {responded}
                        </div>
                        <p className="text-xs text-base-content/50">
                            {totalOutreach > 0 ? `${Math.round((responded / totalOutreach) * 100)}% response rate` : 'No data'}
                        </p>
                    </div>
                </motion.div>

                {/* No Response */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card bg-base-100 shadow-sm border border-base-300"
                >
                    <div className="card-body p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-error/10 text-error">
                                <XCircle size={20} />
                            </div>
                            <h3 className="font-semibold text-base-content/70">No Response</h3>
                        </div>
                        <div className="text-3xl font-bold text-base-content">
                            {noResponse}
                        </div>
                        <p className="text-xs text-base-content/50">Awaiting reply</p>
                    </div>
                </motion.div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Partners */}
                {partnerData.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="card bg-base-100 shadow-sm border border-base-300"
                    >
                        <div className="card-body">
                            <h3 className="card-title text-base flex justify-between items-center">
                                <span>Top Outreach Targets</span>
                                <Building2 size={16} className="text-base-content/40" />
                            </h3>

                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={partnerData}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                                    >
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={95}
                                            tick={{ fontSize: 11, fill: 'oklch(var(--bc))' }}
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
                                            barSize={20}
                                            fill={COLORS.primary}
                                        >
                                            {partnerData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Email Domains */}
                {emailData.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="card bg-base-100 shadow-sm border border-base-300"
                    >
                        <div className="card-body">
                            <h3 className="card-title text-base flex justify-between items-center">
                                <span>Email Domains</span>
                                <Mail size={16} className="text-base-content/40" />
                            </h3>

                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={emailData}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                                    >
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={115}
                                            tick={{ fontSize: 11, fill: 'oklch(var(--bc))' }}
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
                                            barSize={20}
                                            fill={COLORS.secondary}
                                        >
                                            {emailData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Countries */}
                {countryData.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card bg-base-100 shadow-sm border border-base-300"
                    >
                        <div className="card-body">
                            <h3 className="card-title text-base flex justify-between items-center">
                                <span>Top Countries</span>
                                <Globe size={16} className="text-base-content/40" />
                            </h3>

                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={countryData.slice(0, 8)}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                                    >
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={75}
                                            tick={{ fontSize: 11, fill: 'oklch(var(--bc))' }}
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
                                            barSize={20}
                                            fill={COLORS.accent}
                                        >
                                            {countryData.slice(0, 8).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Response Distribution */}
                {responseData.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card bg-base-100 shadow-sm border border-base-300"
                    >
                        <div className="card-body">
                            <h3 className="card-title text-base flex justify-between items-center">
                                <span>Response Status</span>
                                <MessageSquare size={16} className="text-base-content/40" />
                            </h3>

                            <div className="h-[300px] w-full mt-4 flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={responseData}
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {responseData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.success : COLORS.error} />
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
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default OutreachView;
