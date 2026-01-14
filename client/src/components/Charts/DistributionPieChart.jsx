import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// Use DaisyUI theme colors - these automatically adapt to the selected theme
const THEME_COLORS = [
    'oklch(var(--p))',    // primary
    'oklch(var(--s))',    // secondary
    'oklch(var(--a))',    // accent
    'oklch(var(--in))',   // info
    'oklch(var(--su))',   // success
    'oklch(var(--wa))',   // warning
    'oklch(var(--er))',   // error
    'oklch(var(--p) / 0.7)',  // primary lighter
    'oklch(var(--s) / 0.7)',  // secondary lighter
    'oklch(var(--a) / 0.7)'   // accent lighter
];

const DistributionPieChart = ({ data, title }) => {
    if (!data || data.length === 0) {
        return (
            <div className="card bg-base-100 shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-4">{title}</h3>
                <div className="text-center py-8 text-base-content/50">
                    No data available
                </div>
            </div>
        );
    }

    // Custom label to show name and percentage
    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent < 0.05) return null; // Don't show label for very small slices

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="text-xs font-semibold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
                <h3 className="card-title text-lg">{title}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderLabel}
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={THEME_COLORS[index % THEME_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value, name, props) => [value, props.payload.name]}
                            contentStyle={{
                                backgroundColor: 'oklch(var(--b1))',
                                border: '1px solid oklch(var(--bc) / 0.2)',
                                color: 'oklch(var(--bc))'
                            }}
                            labelStyle={{ color: 'oklch(var(--bc))' }}
                            itemStyle={{ color: 'oklch(var(--bc))' }}
                        />
                        <Legend
                            formatter={(value, entry) => `${entry.payload.name} (${entry.payload.value})`}
                            wrapperStyle={{ fontSize: '12px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DistributionPieChart;
