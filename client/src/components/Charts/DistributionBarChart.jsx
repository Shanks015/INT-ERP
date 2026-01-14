import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

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

const DistributionBarChart = ({ data, title, dataKey = 'value', nameKey = 'name' }) => {
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

    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
                <h3 className="card-title text-lg">{title}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis
                            dataKey={nameKey}
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            interval={0}
                            tick={{ fontSize: 11 }}
                        />
                        <YAxis />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'oklch(var(--b1))',
                                border: '1px solid oklch(var(--bc) / 0.2)',
                                color: 'oklch(var(--bc))'
                            }}
                            labelStyle={{ color: 'oklch(var(--bc))' }}
                            itemStyle={{ color: 'oklch(var(--bc))' }}
                        />
                        <Legend />
                        <Bar dataKey={dataKey} name="Count">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={THEME_COLORS[index % THEME_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DistributionBarChart;
