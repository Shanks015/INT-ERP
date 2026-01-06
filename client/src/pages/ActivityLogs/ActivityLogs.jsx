import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Activity, Download, Search, X, TrendingUp, Users, Package, Calendar } from 'lucide-react';

const ActivityLogs = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        module: '',
        action: '',
        startDate: '',
        endDate: ''
    });
    const [pagination, setPagination] = useState({
        current: 1,
        total: 0,
        pages: 0,
        limit: 20
    });

    // Check if user is admin
    if (user?.role !== 'admin') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Activity size={48} className="mx-auto text-error mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-base-content/70">Only administrators can access activity logs.</p>
                </div>
            </div>
        );
    }

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [pagination.current, filters]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.current,
                limit: pagination.limit,
                ...filters
            };

            const response = await api.get('/activity-logs', { params });
            setLogs(response.data.data);
            setPagination({
                ...pagination,
                total: response.data.pagination.total,
                pages: response.data.pagination.pages
            });
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/activity-logs/stats');
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters({ ...filters, [name]: value });
        setPagination({ ...pagination, current: 1 });
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            module: '',
            action: '',
            startDate: '',
            endDate: ''
        });
    };

    const handleExport = async () => {
        try {
            const params = { ...filters };
            const response = await api.get('/activity-logs/export', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `activity-logs-${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success('Activity logs exported successfully');
        } catch (error) {
            toast.error('Error exporting logs');
        }
    };

    const getActionColor = (action) => {
        const colors = {
            create: 'badge-success',
            update: 'badge-warning',
            delete: 'badge-error',
            login: 'badge-info',
            logout: 'badge-ghost',
            export: 'badge-primary',
            import: 'badge-primary',
            view: 'badge-ghost'
        };
        return colors[action] || 'badge-ghost';
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Activity size={32} className="text-primary" />
                        Activity Logs
                    </h1>
                    <p className="text-base-content/70 mt-2">Monitor all user activities and system events</p>
                </div>
                <button onClick={handleExport} className="btn btn-primary">
                    <Download size={18} />
                    Export CSV
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="stat bg-base-200 rounded-lg">
                        <div className="stat-figure text-primary">
                            <TrendingUp size={32} />
                        </div>
                        <div className="stat-title">Total Activities</div>
                        <div className="stat-value text-primary">{stats.total}</div>
                    </div>

                    <div className="stat bg-base-200 rounded-lg">
                        <div className="stat-figure text-secondary">
                            <Users size={32} />
                        </div>
                        <div className="stat-title">Active Users</div>
                        <div className="stat-value text-secondary">{stats.byUser.length}</div>
                    </div>

                    <div className="stat bg-base-200 rounded-lg">
                        <div className="stat-figure text-accent">
                            <Package size={32} />
                        </div>
                        <div className="stat-title">Modules</div>
                        <div className="stat-value text-accent">{stats.byModule.length}</div>
                    </div>

                    <div className="stat bg-base-200 rounded-lg">
                        <div className="stat-figure text-info">
                            <Calendar size={32} />
                        </div>
                        <div className="stat-title">Recent (24h)</div>
                        <div className="stat-value text-info">
                            {stats.recentActivity.filter(a =>
                                new Date(a.timestamp) > new Date(Date.now() - 86400000)
                            ).length}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Filters</h3>
                        <button onClick={handleClearFilters} className="btn btn-ghost btn-sm gap-2">
                            <X size={16} />
                            Clear All
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="form-control">
                            <label className="label"><span className="label-text">Search</span></label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="search"
                                    placeholder="User or target..."
                                    className="input input-bordered w-full pr-10"
                                    value={filters.search}
                                    onChange={handleFilterChange}
                                />
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50" size={20} />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Action</span></label>
                            <select name="action" value={filters.action} onChange={handleFilterChange} className="select select-bordered">
                                <option value="">All Actions</option>
                                <option value="create">Create</option>
                                <option value="update">Update</option>
                                <option value="delete">Delete</option>
                                <option value="login">Login</option>
                                <option value="logout">Logout</option>
                                <option value="export">Export</option>
                                <option value="import">Import</option>
                            </select>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Module</span></label>
                            <select name="module" value={filters.module} onChange={handleFilterChange} className="select select-bordered">
                                <option value="">All Modules</option>
                                <option value="partners">Partners</option>
                                <option value="events">Events</option>
                                <option value="conferences">Conferences</option>
                                <option value="scholars">Scholars</option>
                                <option value="users">Users</option>
                                <option value="settings">Settings</option>
                                <option value="auth">Auth</option>
                            </select>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Start Date</span></label>
                            <input
                                type="date"
                                name="startDate"
                                className="input input-bordered"
                                value={filters.startDate}
                                onChange={handleFilterChange}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">End Date</span></label>
                            <input
                                type="date"
                                name="endDate"
                                className="input input-bordered"
                                value={filters.endDate}
                                onChange={handleFilterChange}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Module</th>
                                    <th>Target</th>
                                    <th>Time</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-8"><span className="loading loading-spinner loading-lg"></span></td></tr>
                                ) : logs.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8">No activity logs found</td></tr>
                                ) : (
                                    logs.map(log => (
                                        <tr key={log._id}>
                                            <td>
                                                <div className="font-medium">{log.userName}</div>
                                            </td>
                                            <td>
                                                <span className={`badge ${getActionColor(log.action)} badge-sm`}>
                                                    {log.action.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge badge-outline badge-sm">{log.module}</span>
                                            </td>
                                            <td className="max-w-xs truncate">{log.targetName || '-'}</td>
                                            <td className="text-sm">{formatTime(log.timestamp)}</td>
                                            <td className="text-sm text-base-content/70">{log.ipAddress || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex justify-center mt-4">
                            <div className="join">
                                <button
                                    onClick={() => setPagination({ ...pagination, current: pagination.current - 1 })}
                                    className="join-item btn btn-sm"
                                    disabled={pagination.current === 1}
                                >
                                    «
                                </button>
                                <button className="join-item btn btn-sm">
                                    Page {pagination.current} of {pagination.pages}
                                </button>
                                <button
                                    onClick={() => setPagination({ ...pagination, current: pagination.current + 1 })}
                                    className="join-item btn btn-sm"
                                    disabled={pagination.current === pagination.pages}
                                >
                                    »
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityLogs;
