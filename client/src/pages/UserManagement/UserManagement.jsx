import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Users, Check, X, Clock, UserCheck, UserX } from 'lucide-react';

const UserManagement = () => {
    const { isAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [rejectModal, setRejectModal] = useState({ isOpen: false, user: null });
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [processingUserId, setProcessingUserId] = useState(null);

    useEffect(() => {
        fetchUsers();

        // Auto-refresh every 3 seconds for real-time updates
        const interval = setInterval(() => {
            fetchUsers();
        }, 3000);

        return () => clearInterval(interval);
    }, [filter]);

    const fetchUsers = async () => {
        try {
            const timestamp = new Date().getTime();
            const endpoint = filter === 'all'
                ? `/users?_t=${timestamp}`
                : `/users?approvalStatus=${filter}&_t=${timestamp}`;

            const response = await api.get(endpoint, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            setUsers(response.data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Error fetching users');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId) => {
        try {
            setProcessingUserId(userId);
            await api.post(`/users/${userId}/approve`);
            toast.success('User approved successfully');

            // Optimistic update
            if (filter === 'all') {
                setUsers(users.map(u =>
                    u._id === userId ? { ...u, approvalStatus: 'approved', approved: true } : u
                ));
            } else {
                setUsers(users.filter(u => u._id !== userId));
            }

            // Fetch fresh data after a delay to allow DB update to propagate
            setTimeout(() => {
                fetchUsers();
                window.dispatchEvent(new Event('pendingCountUpdated'));
            }, 1000);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error approving user');
            await fetchUsers();
        } finally {
            setProcessingUserId(null);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }

        try {
            setSubmitting(true);
            const userId = rejectModal.user._id;

            await api.post(`/users/${userId}/reject`, {
                reason: rejectionReason
            });

            toast.success('User rejected successfully');

            // Close modal first
            setRejectModal({ isOpen: false, user: null });
            setRejectionReason('');

            toast.success('User rejected successfully');

            // Optimistic update
            if (filter === 'all') {
                setUsers(users.map(u =>
                    u._id === userId
                        ? { ...u, approvalStatus: 'rejected', approved: false, rejectionReason: rejectionReason }
                        : u
                ));
            } else {
                setUsers(users.filter(u => u._id !== userId));
            }

            // Close modal
            setRejectModal({ isOpen: false, user: null });
            setRejectionReason('');

            // Fetch fresh data after a delay
            setTimeout(() => {
                fetchUsers();
                window.dispatchEvent(new Event('pendingCountUpdated'));
            }, 1000);
        } catch (error) {
            console.error('Rejection error:', error);
            toast.error(error.response?.data?.message || 'Error rejecting user');
            await fetchUsers();
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: <span className="badge badge-warning gap-2"><Clock size={14} />Pending</span>,
            approved: <span className="badge badge-success gap-2"><UserCheck size={14} />Approved</span>,
            rejected: <span className="badge badge-error gap-2"><UserX size={14} />Rejected</span>
        };
        return badges[status] || badges.pending;
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-base-content/70 mt-2">Approve or reject user registrations</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="tabs tabs-boxed mb-6">
                <a className={`tab ${filter === 'all' ? 'tab-active' : ''}`} onClick={() => setFilter('all')}>All Users</a>
                <a className={`tab ${filter === 'pending' ? 'tab-active' : ''}`} onClick={() => setFilter('pending')}>Pending</a>
                <a className={`tab ${filter === 'approved' ? 'tab-active' : ''}`} onClick={() => setFilter('approved')}>Approved</a>
                <a className={`tab ${filter === 'rejected' ? 'tab-active' : ''}`} onClick={() => setFilter('rejected')}>Rejected</a>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Registered</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8">No users found</td></tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user._id}>
                                            <td>{user.name}</td>
                                            <td>
                                                <a
                                                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${user.email}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="link link-primary"
                                                >
                                                    {user.email}
                                                </a>
                                            </td>
                                            <td><span className="badge">{user.role}</span></td>
                                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                            <td>{getStatusBadge(user.approvalStatus)}</td>
                                            <td>
                                                {user.approvalStatus === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleApprove(user._id)}
                                                            className="btn btn-success btn-sm"
                                                            disabled={processingUserId === user._id}
                                                        >
                                                            {processingUserId === user._id ? (
                                                                <span className="loading loading-spinner loading-xs"></span>
                                                            ) : (
                                                                <Check size={16} />
                                                            )}
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectModal({ isOpen: true, user })}
                                                            className="btn btn-error btn-sm"
                                                            disabled={processingUserId === user._id}
                                                        >
                                                            <X size={16} />Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {user.approvalStatus === 'rejected' && user.rejectionReason && (
                                                    <div className="tooltip" data-tip={user.rejectionReason}>
                                                        <span className="text-sm text-error cursor-help">View Reason</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Rejection Modal */}
            {rejectModal.isOpen && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Reject User Registration</h3>
                        <p className="mb-4">User: <strong>{rejectModal.user?.name}</strong> ({rejectModal.user?.email})</p>
                        <div className="form-control">
                            <label className="label"><span className="label-text">Rejection Reason</span></label>
                            <textarea
                                className="textarea textarea-bordered h-24"
                                placeholder="Enter reason for rejection..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                required
                            />
                        </div>
                        <div className="modal-action">
                            <button
                                onClick={() => { setRejectModal({ isOpen: false, user: null }); setRejectionReason(''); }}
                                className="btn"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                className="btn btn-error"
                                disabled={submitting || !rejectionReason.trim()}
                            >
                                {submitting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        Rejecting...
                                    </>
                                ) : (
                                    'Reject User'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;

