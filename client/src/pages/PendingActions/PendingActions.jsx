import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Check, X, Clock, AlertCircle } from 'lucide-react';

const PendingActions = () => {
    const { isAdmin } = useAuth();
    const [pendingItems, setPendingItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState('all');

    const modules = [
        { name: 'partners', label: 'Partners', endpoint: '/partners' },
        { name: 'campus-visits', label: 'Campus Visits', endpoint: '/campus-visits' },
        { name: 'events', label: 'Events', endpoint: '/events' },
        { name: 'conferences', label: 'Conferences', endpoint: '/conferences' },
        { name: 'mou-signing-ceremonies', label: 'MoU Signing Ceremonies', endpoint: '/mou-signing-ceremonies' },
        { name: 'scholars-in-residence', label: 'Scholars', endpoint: '/scholars-in-residence' },
        { name: 'mou-updates', label: 'MoU Updates', endpoint: '/mou-updates' },
        { name: 'immersion-programs', label: 'Immersion Programs', endpoint: '/immersion-programs' },
        { name: 'student-exchange', label: 'Student Exchange', endpoint: '/student-exchange' },
        { name: 'masters-abroad', label: 'Masters Abroad', endpoint: '/masters-abroad' },
        { name: 'memberships', label: 'Memberships', endpoint: '/memberships' },
        { name: 'digital-media', label: 'Digital Media', endpoint: '/digital-media' },
    ];

    useEffect(() => {
        if (isAdmin) {
            fetchPendingItems();
        }
    }, [isAdmin, selectedModule]);

    const fetchPendingItems = async () => {
        setLoading(true);
        try {
            const modulesToFetch = selectedModule === 'all' ? modules : modules.filter(m => m.name === selectedModule);

            const responses = await Promise.all(
                modulesToFetch.map(module =>
                    api.get(`${module.endpoint}/pending/all`).catch(() => ({ data: { data: [] } }))
                )
            );

            const allPending = responses.flatMap((response, index) => {
                const items = response.data.data || [];
                return items.map(item => ({
                    ...item,
                    moduleName: modulesToFetch[index].name,
                    moduleLabel: modulesToFetch[index].label,
                    moduleEndpoint: modulesToFetch[index].endpoint
                }));
            });

            setPendingItems(allPending);
        } catch (error) {
            toast.error('Error fetching pending items');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (item) => {
        try {
            await api.post(`${item.moduleEndpoint}/pending/${item._id}/approve`);
            toast.success('Changes approved successfully');
            fetchPendingItems();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error approving changes');
        }
    };

    const handleReject = async (item) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            await api.post(`${item.moduleEndpoint}/pending/${item._id}/reject`, { reason });
            toast.success('Changes rejected');
            fetchPendingItems();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error rejecting changes');
        }
    };

    const getDisplayValue = (item) => {
        // Try to get a meaningful display value from the item
        return item.title || item.name || item.studentName || item.visitorName ||
            item.scholarName || item.university || item.conferenceName ||
            item.contactName || 'Unknown';
    };

    if (!isAdmin) {
        return (
            <div className="alert alert-error">
                <AlertCircle size={20} />
                <span>Access Denied. This page is only for administrators.</span>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Pending Actions</h1>
                <p className="text-base-content/70 mt-2">
                    Review and approve/reject pending changes from employees and interns
                </p>
            </div>

            {/* Filter */}
            <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                    <div className="form-control w-full max-w-xs">
                        <label className="label">
                            <span className="label-text">Filter by Module</span>
                        </label>
                        <select
                            className="select select-bordered"
                            value={selectedModule}
                            onChange={(e) => setSelectedModule(e.target.value)}
                        >
                            <option value="all">All Modules</option>
                            {modules.map(module => (
                                <option key={module.name} value={module.name}>{module.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Pending Items */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    {pendingItems.length === 0 ? (
                        <div className="text-center py-8">
                            <Clock size={48} className="mx-auto mb-4 text-base-content/30" />
                            <p className="text-lg">No pending actions</p>
                            <p className="text-sm text-base-content/70">All changes have been reviewed!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra">
                                <thead>
                                    <tr>
                                        <th>Module</th>
                                        <th>Type</th>
                                        <th>Item</th>
                                        <th>Submitted By</th>
                                        <th>Reason/Changes</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingItems.map((item) => (
                                        <tr key={`${item.moduleName}-${item._id}`}>
                                            <td>
                                                <span className="badge badge-outline">{item.moduleLabel}</span>
                                            </td>
                                            <td>
                                                {item.status === 'pending_edit' && (
                                                    <span className="badge badge-warning">Edit Request</span>
                                                )}
                                                {item.status === 'pending_delete' && (
                                                    <span className="badge badge-error">Delete Request</span>
                                                )}
                                            </td>
                                            <td className="font-medium">{getDisplayValue(item)}</td>
                                            <td>{item.updatedBy?.name || item.createdBy?.name || 'Unknown'}</td>
                                            <td className="max-w-xs truncate">
                                                {item.status === 'pending_delete' && item.deletionReason}
                                                {item.status === 'pending_edit' && 'Field changes requested'}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApprove(item)}
                                                        className="btn btn-success btn-sm"
                                                        title="Approve"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(item)}
                                                        className="btn btn-error btn-sm"
                                                        title="Reject"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PendingActions;
