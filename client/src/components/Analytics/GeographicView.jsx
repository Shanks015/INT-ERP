import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import WorldMap from './WorldMap';

const GeographicView = ({ data }) => {
    console.log('GeographicView received data:', data);

    const distributionData = data.countryDistribution || [];
    console.log('Distribution data:', distributionData);

    // If no distribution data but it's an "active" stat, show active breakdown
    if ((!distributionData || distributionData.length === 0) && data.statType === 'active') {
        const activeCount = data.active || data.value || 0;
        const totalCount = data.total || activeCount;
        const inactiveCount = totalCount - activeCount;

        const statusData = [
            { name: 'Active', value: activeCount },
            { name: 'Inactive', value: inactiveCount }
        ];

        const COLORS = ['oklch(var(--su))', 'oklch(var(--wa))'];

        return (
            <div className="space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body">
                        <h3 className="card-title text-lg">Active vs Inactive Distribution</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'oklch(var(--b1))',
                                            border: '1px solid oklch(var(--bc) / 0.2)',
                                            color: 'oklch(var(--bc))'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            <div className="flex flex-col justify-center">
                                <div className="stat bg-base-300 rounded-lg mb-2">
                                    <div className="stat-title">Active Records</div>
                                    <div className="stat-value text-success">{activeCount}</div>
                                    <div className="stat-desc">{((activeCount / totalCount) * 100).toFixed(1)}% of total</div>
                                </div>
                                <div className="stat bg-base-300 rounded-lg">
                                    <div className="stat-title">Inactive Records</div>
                                    <div className="stat-value text-warning">{inactiveCount}</div>
                                    <div className="stat-desc">{((inactiveCount / totalCount) * 100).toFixed(1)}% of total</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // If no distribution data, show message
    if (!distributionData || distributionData.length === 0) {
        return (
            <div className="card bg-base-200 shadow-sm p-8 text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-semibold mb-2">No Geographic Data Available</h3>
                <p className="text-sm text-base-content/70">
                    Country distribution data is not available for this view.
                </p>
            </div>
        );
    }

    const topCountries = distributionData.slice(0, 10);

    // Colors for bars/pie
    const COLORS = [
        'oklch(var(--p))',
        'oklch(var(--s))',
        'oklch(var(--a))',
        'oklch(var(--in))',
        'oklch(var(--su))',
        'oklch(var(--wa))',
        'oklch(var(--er))',
        '#8b5cf6',
        '#ec4899',
        '#f59e0b'
    ];

    return (
        <div className="space-y-6">
            {/* Geographic Distribution Bar Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card bg-base-200 shadow-sm"
            >
                <div className="card-body">
                    <h3 className="card-title text-lg">Top 10 Countries/Regions</h3>
                    <p className="text-sm text-base-content/70">
                        Click on a bar to filter records from that country
                    </p>

                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                            data={topCountries}
                            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                                tick={{ fontSize: 11, fill: 'oklch(var(--bc))' }}
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
                                cursor={{ fill: 'oklch(var(--bc) / 0.1)' }}
                            />
                            <Bar
                                dataKey="value"
                                radius={[8, 8, 0, 0]}
                                cursor="pointer"
                            >
                                {topCountries.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Grid View - Pie Chart and List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body">
                        <h3 className="card-title text-sm">Distribution Breakdown</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={topCountries}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {topCountries.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'oklch(var(--b1))',
                                        border: '1px solid oklch(var(--bc) / 0.2)',
                                        color: 'oklch(var(--bc))'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Country List */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card bg-base-200 shadow-sm"
                >
                    <div className="card-body">
                        <h3 className="card-title text-sm">Detailed Breakdown</h3>
                        <div className="overflow-y-auto max-h-64">
                            <table className="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Country</th>
                                        <th>Count</th>
                                        <th>Share</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topCountries.map((country, index) => {
                                        const percentage = ((country.value / data.total) * 100).toFixed(1);
                                        return (
                                            <tr key={country.name} className="hover">
                                                <td>
                                                    <div
                                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                    >
                                                        {index + 1}
                                                    </div>
                                                </td>
                                                <td className="font-medium">{country.name}</td>
                                                <td>{country.value}</td>
                                                <td>{percentage}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Interactive World Map */}
            <WorldMap data={data} />
        </div>
    );
};

export default GeographicView;
