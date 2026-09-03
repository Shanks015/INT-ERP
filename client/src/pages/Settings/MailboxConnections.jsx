import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { PlusCircle, Trash2, RefreshCw, WifiOff, Wifi, Eye, EyeOff, X } from 'lucide-react';
import { toDDMMM } from '../../utils/dateFormat';

const statusBadge = { active: 'badge-success', error: 'badge-error', disconnected: 'badge-neutral' };

const MailboxConnections = () => {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addModal, setAddModal] = useState(false);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
    const [syncing, setSyncing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ employeeId: '', employeeName: '', emailAddress: '', appPassword: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [users, setUsers] = useState([]);

    useEffect(() => { fetchConnections(); fetchUsers(); }, []);

    const fetchConnections = async () => {
        try {
            setLoading(true);
            const r = await api.get('/mailboxes');
            setConnections(r.data.data || []);
        } catch { toast.error('Failed to load mailbox connections'); }
        finally { setLoading(false); }
    };

    const fetchUsers = async () => {
        try {
            const r = await api.get('/users');
            setUsers(r.data.users || r.data.data || []);
        } catch (e) { console.error(e); }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await api.post('/mailboxes', form);
            toast.success('Mailbox connected successfully ✅');
            setAddModal(false);
            setForm({ employeeId: '', employeeName: '', emailAddress: '', appPassword: '' });
            fetchConnections();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to add mailbox'); }
    };

    const handleSync = async (id) => {
        setSyncing(id);
        try {
            await api.post(`/mailboxes/${id}/sync`);
            toast.success('Sync started in background. Check status in ~30 seconds.');
            setTimeout(fetchConnections, 15000);
        } catch { toast.error('Failed to trigger sync'); }
        finally { setSyncing(null); }
    };

    const triggerDelete = async () => {
        if (!deleteConfirmModal) return;
        const id = deleteConfirmModal._id;
        setDeleting(id);
        try {
            await api.delete(`/mailboxes/${id}`);
            toast.success('Mailbox removed ✅');
            setDeleteConfirmModal(null);
            fetchConnections();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to remove mailbox');
        } finally {
            setDeleting(null);
        }
    };

    const handleToggleStatus = async (c) => {
        const newStatus = c.status === 'active' ? 'disconnected' : 'active';
        try {
            await api.put(`/mailboxes/${c._id}/status`, { status: newStatus });
            toast.success(`Mailbox ${newStatus}`);
            fetchConnections();
        } catch { toast.error('Failed to update status'); }
    };

    const handleUserSelect = (e) => {
        const user = users.find(u => u._id === e.target.value);
        setForm(p => ({
            ...p,
            employeeId: e.target.value,
            employeeName: user?.name || '',
            emailAddress: user?.email || p.emailAddress
        }));
    };

    const formatLastSync = (lastSyncAt) => {
        if (!lastSyncAt) return 'Never';
        const dt = new Date(lastSyncAt);
        if (isNaN(dt.getTime())) return 'Never';
        const timeParts = dt.toLocaleString('en-IN').split(', ').slice(1).join(', ');
        return `${toDDMMM(dt)}, ${timeParts}`;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Mailbox Connections</h2>
                    <p className="text-sm text-base-content/60 mt-1">Employee Gmail accounts monitored for partner replies via IMAP</p>
                </div>
                <button onClick={() => setAddModal(true)} className="btn btn-primary gap-2">
                    <PlusCircle size={18} /> Connect Mailbox
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>
            ) : connections.length === 0 ? (
                <div className="card bg-base-200">
                    <div className="card-body items-center text-center py-16">
                        <EyeOff size={40} className="text-base-content/30 mb-3" />
                        <p className="text-base-content/50">No mailboxes connected yet.</p>
                        <p className="text-sm text-base-content/40">Add employee Gmail accounts to enable automatic reply detection.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {connections.map(c => (
                        <div key={c._id} className="card bg-base-100 shadow border border-base-200">
                            <div className="card-body p-5">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold truncate">{c.employeeName}</span>
                                            <span className={`badge badge-sm ${statusBadge[c.status] || 'badge-ghost'}`}>{c.status}</span>
                                        </div>
                                        <p className="text-sm text-base-content/70 truncate">{c.emailAddress}</p>
                                        <div className="mt-2 space-y-0.5 text-xs text-base-content/50">
                                            <p>Last synced: {formatLastSync(c.lastSyncAt)}</p>
                                            <p>Total replies matched: <span className="font-semibold text-base-content">{c.totalMatched}</span></p>
                                            {c.lastError && <p className="text-error truncate" title={c.lastError}>⚠ {c.lastError}</p>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0">
                                        <button onClick={() => handleSync(c._id)} disabled={syncing === c._id}
                                            className="btn btn-info btn-xs gap-1" title="Sync now">
                                            <RefreshCw size={13} className={syncing === c._id ? 'animate-spin' : ''} />
                                            Sync
                                        </button>
                                        <button onClick={() => handleToggleStatus(c)}
                                            className={`btn btn-xs gap-1 ${c.status === 'active' ? 'btn-warning' : 'btn-success'}`}>
                                            {c.status === 'active' ? <><WifiOff size={13} /> Pause</> : <><Wifi size={13} /> Resume</>}
                                        </button>
                                        <button onClick={() => setDeleteConfirmModal(c)} disabled={deleting === c._id}
                                            className="btn btn-error btn-xs gap-1">
                                            <Trash2 size={13} /> Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Mailbox Modal */}
            {addModal && (
                <dialog open className="modal modal-open">
                    <div className="modal-box max-w-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Connect Employee Mailbox</h3>
                            <button onClick={() => setAddModal(false)} className="btn btn-sm btn-ghost btn-circle"><X size={18} /></button>
                        </div>

                        <div className="alert alert-info mb-4 text-sm">
                            <div>
                                <p className="font-semibold">Prerequisites:</p>
                                <ul className="list-disc ml-4 mt-1 space-y-0.5">
                                    <li>Gmail 2-Step Verification must be enabled</li>
                                    <li>IMAP must be enabled in Gmail settings</li>
                                    <li>Use App Password (not Gmail password)</li>
                                </ul>
                            </div>
                        </div>

                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="form-control">
                                <label className="label"><span className="label-text font-medium">Employee</span></label>
                                <select className="select select-bordered" onChange={handleUserSelect} defaultValue="">
                                    <option value="" disabled>Select employee...</option>
                                    {users.map(u => <option key={u._id} value={u._id}>{u.name} — {u.email}</option>)}
                                </select>
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text font-medium">Gmail Address</span></label>
                                <input type="email" className="input input-bordered" placeholder="employee@gmail.com"
                                    value={form.emailAddress} onChange={e => setForm(p => ({ ...p, emailAddress: e.target.value }))} required />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">App Password</span>
                                    <a href="https://myaccount.google.com/apppasswords" target="_blank" className="label-text-alt link link-primary">
                                        Generate →
                                    </a>
                                </label>
                                <div className="relative">
                                    <input type={showPwd ? 'text' : 'password'} className="input input-bordered w-full pr-12"
                                        placeholder="xxxx xxxx xxxx xxxx"
                                        value={form.appPassword} onChange={e => setForm(p => ({ ...p, appPassword: e.target.value }))} required />
                                    <button type="button" onClick={() => setShowPwd(p => !p)}
                                        className="absolute right-3 top-3 text-base-content/50 hover:text-base-content">
                                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <label className="label"><span className="label-text-alt text-base-content/40">Stored encrypted with AES-256</span></label>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setAddModal(false)} className="btn btn-ghost">Cancel</button>
                                <button type="submit" className="btn btn-primary">Connect Mailbox</button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop" onClick={() => setAddModal(false)} />
                </dialog>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmModal && (
                <dialog open className="modal modal-open">
                    <div className="modal-box max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-error flex items-center gap-2">
                                <Trash2 size={20} /> Remove Mailbox Connection
                            </h3>
                            <button onClick={() => setDeleteConfirmModal(null)} className="btn btn-sm btn-ghost btn-circle">
                                <X size={18} />
                              </button>
                        </div>
                        
                        <div className="py-2">
                            <p className="text-sm">
                                Are you sure you want to remove the mailbox connection for <span className="font-semibold text-error">{deleteConfirmModal.employeeName}</span> ({deleteConfirmModal.emailAddress})?
                            </p>
                            <p className="text-xs text-base-content/50 mt-2">
                                This will stop automatic reply detection, follow-up automation, and real-time statistics tracking for all outreach campaigns synchronized through this mailbox.
                            </p>
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4">
                            <button type="button" onClick={() => setDeleteConfirmModal(null)} className="btn btn-ghost">Cancel</button>
                            <button 
                                type="button" 
                                onClick={triggerDelete} 
                                disabled={deleting === deleteConfirmModal._id} 
                                className="btn btn-error gap-2"
                            >
                                {deleting === deleteConfirmModal._id ? (
                                    <span className="loading loading-spinner loading-xs" />
                                ) : (
                                    <Trash2 size={16} />
                                )}
                                Remove Connection
                            </button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop" onClick={() => setDeleteConfirmModal(null)} />
                </dialog>
            )}
        </div>
    );
};

export default MailboxConnections;
