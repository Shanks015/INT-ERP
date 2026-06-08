import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Users, Check, X, Clock, UserCheck, UserX, Edit, Trash2, Plus, Shield, Search } from 'lucide-react';

const ALL_MODULES = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'partners', name: 'Partners' },
    { id: 'campus-visits', name: 'Campus Visits' },
    { id: 'scholars-in-residence', name: 'Scholars in Residence' },
    { id: 'events', name: 'Events' },
    { id: 'conferences', name: 'Conferences' },
    { id: 'mou-updates', name: 'MoU Updates' },
    { id: 'mou-signing-ceremonies', name: 'MoU Ceremonies' },
    { id: 'student-exchange', name: 'Student Exchange' },
    { id: 'immersion-programs', name: 'Immersion Programs' },
    { id: 'masters-abroad', name: 'Masters Abroad' },
    { id: 'memberships', name: 'Memberships' },
    { id: 'social-media', name: 'Social Media' },
    { id: 'digital-media', name: 'Digital Media' },
    { id: 'outreach', name: 'Outreach' },
    { id: 'meeting-trackers', name: 'Meeting Trackers' },
    { id: 'reports', name: 'Reports' },
    { id: 'settings', name: 'Settings' }
];

const UserManagement = () => {
    const { isAdmin, user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [rejectModal, setRejectModal] = useState({ isOpen: false, user: null });
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [processingUserId, setProcessingUserId] = useState(null);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);

    // Create / Edit User Modal State
    const [userModal, setUserModal] = useState({
        isOpen: false,
        mode: 'create', // 'create' | 'edit'
        user: null
    });
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        allowedModules: []
    });

    useEffect(() => {
        fetchUsers();

        // Auto-refresh every 5 seconds for updates
        const interval = setInterval(() => {
            fetchUsers();
        }, 5000);

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

            setTimeout(() => {
                fetchUsers();
                window.dispatchEvent(new Event('pendingCountUpdated'));
            }, 500);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error approving user');
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
            setRejectModal({ isOpen: false, user: null });
            setRejectionReason('');

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

            setTimeout(() => {
                fetchUsers();
                window.dispatchEvent(new Event('pendingCountUpdated'));
            }, 500);
        } catch (error) {
            console.error('Rejection error:', error);
            toast.error(error.response?.data?.message || 'Error rejecting user');
        } finally {
            setSubmitting(false);
        }
    };

    const triggerDelete = async () => {
        if (!deleteConfirmModal) return;
        const userId = deleteConfirmModal._id;

        if (userId === currentUser?._id || userId === currentUser?.id) {
            toast.error('Cannot delete your own account');
            return;
        }

        try {
            setProcessingUserId(userId);
            await api.delete(`/users/${userId}`);
            toast.success('User deleted successfully ✅');
            setUsers(users.filter(u => u._id !== userId));
            setDeleteConfirmModal(null);
            
            setTimeout(() => {
                fetchUsers();
                window.dispatchEvent(new Event('pendingCountUpdated'));
            }, 500);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting user');
        } finally {
            setProcessingUserId(null);
        }
    };

    const openCreateModal = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'employee',
            allowedModules: ALL_MODULES.map(m => m.id) // Default all checked initially
        });
        setUserModal({
            isOpen: true,
            mode: 'create',
            user: null
        });
    };

    const openEditModal = (user) => {
        setFormData({
            name: user.name || '',
            email: user.email || '',
            password: '', // Leave empty to keep unchanged
            role: user.role || 'employee',
            allowedModules: user.allowedModules || []
        });
        setUserModal({
            isOpen: true,
            mode: 'edit',
            user
        });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.email || (userModal.mode === 'create' && !formData.password)) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                allowedModules: formData.role === 'intern' ? formData.allowedModules : []
            };

            if (formData.password.trim()) {
                payload.password = formData.password;
            }

            if (userModal.mode === 'create') {
                await api.post('/users', payload);
                toast.success('User created successfully');
            } else {
                await api.put(`/users/${userModal.user._id}`, payload);
                toast.success('User updated successfully');
            }

            setUserModal({ isOpen: false, mode: 'create', user: null });
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || `Error saving user`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleModuleToggle = (moduleId) => {
        setFormData(prev => {
            const allowed = [...prev.allowedModules];
            if (allowed.includes(moduleId)) {
                return { ...prev, allowedModules: allowed.filter(id => id !== moduleId) };
            } else {
                return { ...prev, allowedModules: [...allowed, moduleId] };
            }
        });
    };

    const handleSelectAllModules = () => {
        setFormData(prev => ({
            ...prev,
            allowedModules: ALL_MODULES.map(m => m.id)
        }));
    };

    const handleDeselectAllModules = () => {
        setFormData(prev => ({
            ...prev,
            allowedModules: []
        }));
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: <span className="badge badge-warning gap-2"><Clock size={14} />Pending</span>,
            approved: <span className="badge badge-success gap-2"><UserCheck size={14} />Approved</span>,
            rejected: <span className="badge badge-error gap-2"><UserX size={14} />Rejected</span>
        };
        return badges[status] || badges.pending;
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && users.length === 0) {
        return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-base-content/70 mt-2">Manage user records, approve accounts, and configure permissions</p>
                </div>
                <button onClick={openCreateModal} className="btn btn-primary gap-2">
                    <Plus size={18} /> Create User
                </button>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
                <div className="tabs tabs-boxed">
                    <a className={`tab ${filter === 'all' ? 'tab-active' : ''}`} onClick={() => setFilter('all')}>All Users</a>
                    <a className={`tab ${filter === 'pending' ? 'tab-active' : ''}`} onClick={() => setFilter('pending')}>Pending</a>
                    <a className={`tab ${filter === 'approved' ? 'tab-active' : ''}`} onClick={() => setFilter('approved')}>Approved</a>
                    <a className={`tab ${filter === 'rejected' ? 'tab-active' : ''}`} onClick={() => setFilter('rejected')}>Rejected</a>
                </div>

                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="input input-bordered w-full pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body p-4 md:p-6">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Module Access</th>
                                    <th>Status</th>
                                    <th>Registered</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-8 text-base-content/50">No users found</td></tr>
                                ) : (
                                    filteredUsers.map((u) => {
                                        const isSelf = u._id === currentUser?._id || u._id === currentUser?.id;
                                        return (
                                            <tr key={u._id}>
                                                <td className="font-medium">{u.name} {isSelf && <span className="badge badge-ghost badge-sm ml-1">You</span>}</td>
                                                <td>
                                                    <a
                                                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${u.email}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="link link-primary"
                                                    >
                                                        {u.email}
                                                    </a>
                                                </td>
                                                <td>
                                                    <span className={`badge ${
                                                        u.role === 'admin' ? 'badge-primary' : u.role === 'employee' ? 'badge-secondary' : 'badge-accent'
                                                    }`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    {u.role === 'intern' ? (
                                                        <div className="max-w-[200px] truncate text-xs" title={(u.allowedModules || []).join(', ')}>
                                                            {u.allowedModules && u.allowedModules.length > 0 
                                                                ? `${u.allowedModules.length} module(s): ${u.allowedModules.join(', ')}`
                                                                : 'None'}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-base-content/50">Full Access (All Modules)</span>
                                                    )}
                                                </td>
                                                <td>{getStatusBadge(u.approvalStatus)}</td>
                                                <td className="text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                                                <td>
                                                    <div className="flex gap-2 justify-end">
                                                        {u.approvalStatus === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApprove(u._id)}
                                                                    className="btn btn-success btn-xs gap-1"
                                                                    disabled={processingUserId === u._id}
                                                                >
                                                                    {processingUserId === u._id ? (
                                                                        <span className="loading loading-spinner loading-xs"></span>
                                                                    ) : (
                                                                        <Check size={12} />
                                                                    )}
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => setRejectModal({ isOpen: true, user: u })}
                                                                    className="btn btn-error btn-xs gap-1"
                                                                    disabled={processingUserId === u._id}
                                                                >
                                                                    <X size={12} /> Reject
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => openEditModal(u)}
                                                            className="btn btn-ghost btn-xs text-blue-500 hover:bg-blue-500/10"
                                                            title="Edit details & permissions"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        {!isSelf && (
                                                            <button
                                                                onClick={() => setDeleteConfirmModal(u)}
                                                                className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                                                title="Delete User"
                                                                disabled={processingUserId === u._id}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {u.approvalStatus === 'rejected' && u.rejectionReason && (
                                                        <div className="text-right text-xs mt-1">
                                                            <span className="text-error font-medium">Rejected reason: </span>
                                                            <span className="text-base-content/75 italic">"{u.rejectionReason}"</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create/Edit User Modal */}
            {userModal.isOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl bg-base-100">
                        <h3 className="font-bold text-xl mb-6">
                            {userModal.mode === 'create' ? 'Create New User' : 'Edit User details & permissions'}
                        </h3>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control w-full">
                                    <label className="label"><span className="label-text font-semibold">Name *</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        placeholder="Full Name"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="form-control w-full">
                                    <label className="label"><span className="label-text font-semibold">Email Address *</span></label>
                                    <input
                                        type="email"
                                        className="input input-bordered w-full"
                                        placeholder="user@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text font-semibold">
                                            Password {userModal.mode === 'edit' ? '(Leave empty to keep unchanged)' : '*'}
                                        </span>
                                    </label>
                                    <input
                                        type="password"
                                        className="input input-bordered w-full"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                        required={userModal.mode === 'create'}
                                    />
                                </div>
                                <div className="form-control w-full">
                                    <label className="label"><span className="label-text font-semibold">System Role *</span></label>
                                    <select
                                        className="select select-bordered w-full"
                                        value={formData.role}
                                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                                    >
                                        <option value="admin">Administrator</option>
                                        <option value="employee">Employee</option>
                                        <option value="intern">Intern (Role-Based Permissions)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Intern Module Permissions Checklist */}
                            {formData.role === 'intern' && (
                                <div className="border border-base-300 rounded-lg p-4 bg-base-50/50 mt-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-semibold text-sm flex items-center gap-2">
                                            <Shield size={16} className="text-primary" />
                                            Intern Module Permissions
                                        </h4>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleSelectAllModules}
                                                className="btn btn-ghost btn-xs text-primary"
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDeselectAllModules}
                                                className="btn btn-ghost btn-xs text-error"
                                            >
                                                Deselect All
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                                        {ALL_MODULES.map(module => {
                                            const isChecked = formData.allowedModules.includes(module.id);
                                            return (
                                                <label key={module.id} className="label cursor-pointer justify-start gap-3 p-1.5 hover:bg-base-200 rounded transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox checkbox-primary checkbox-sm"
                                                        checked={isChecked}
                                                        onChange={() => handleModuleToggle(module.id)}
                                                    />
                                                    <span className="label-text text-xs font-medium">{module.name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {formData.allowedModules.length === 0 && (
                                        <p className="text-xs text-warning mt-2 italic">
                                            Warning: With no modules selected, this intern will not be able to access any part of the ERP dashboard.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="modal-action">
                                <button
                                    type="button"
                                    onClick={() => setUserModal({ isOpen: false, mode: 'create', user: null })}
                                    className="btn"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        userModal.mode === 'create' ? 'Create User' : 'Save Changes'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {rejectModal.isOpen && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Reject User Registration</h3>
                        <p className="mb-4">User: <strong>{rejectModal.user?.name}</strong> ({rejectModal.user?.email})</p>
                        <div className="form-control">
                            <label className="label"><span className="label-text font-semibold">Rejection Reason</span></label>
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

            {/* Delete Confirmation Modal */}
            {deleteConfirmModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-md bg-base-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-error flex items-center gap-2">
                                <Trash2 size={20} /> Delete User Account
                            </h3>
                            <button onClick={() => setDeleteConfirmModal(null)} className="btn btn-sm btn-ghost btn-circle">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="py-2">
                            <p className="text-sm text-base-content/80">
                                Are you sure you want to delete the user account for <span className="font-semibold text-error">{deleteConfirmModal.name}</span> ({deleteConfirmModal.email})?
                            </p>
                            <p className="text-xs text-base-content/50 mt-2">
                                This action cannot be undone. All personal preferences, assigned modules, and log associations for this user will be permanently affected.
                            </p>
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4">
                            <button 
                                type="button" 
                                onClick={() => setDeleteConfirmModal(null)} 
                                className="btn btn-ghost"
                                disabled={processingUserId === deleteConfirmModal._id}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={triggerDelete} 
                                disabled={processingUserId === deleteConfirmModal._id} 
                                className="btn btn-error gap-2"
                            >
                                {processingUserId === deleteConfirmModal._id ? (
                                    <span className="loading loading-spinner loading-xs" />
                                ) : (
                                    <Trash2 size={16} />
                                )}
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;

