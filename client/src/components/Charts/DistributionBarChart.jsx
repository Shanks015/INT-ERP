import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4'];

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
                            contentStyle={{ backgroundColor: 'oklch(var(--b1))', border: '1px solid oklch(var(--bc) / 0.2)' }}
                        />
                        <Legend />
                        <Bar dataKey={dataKey} name="Count">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DistributionBarChart;
