import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { PlusCircle, Trash2, RefreshCw, WifiOff, Wifi, Eye, EyeOff, X, CheckCircle2, KeyRound } from 'lucide-react';
import { toDDMMM } from '../../utils/dateFormat';

const statusBadge = { active: 'badge-success', error: 'badge-error', disconnected: 'badge-neutral' };

// Step-by-step Gmail setup guide shown inside the connect modal (and the empty
// state) so an employee can finish this without asking an admin.
const AppPasswordGuide = () => (
    <details className="collapse collapse-arrow bg-base-200 border border-base-300 rounded-box">
        <summary className="collapse-title text-sm font-semibold">How to create a Gmail App Password (5 minutes)</summary>
        <div className="collapse-content">
            <ol className="list-decimal ml-4 mt-1 space-y-1.5 text-sm">
                <li>Turn on <b>2-Step Verification</b>: <a className="link link-primary" href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">myaccount.google.com/security</a></li>
                <li>Open <a className="link link-primary" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">myaccount.google.com/apppasswords</a></li>
                <li>App name: type <b>INT-ERP</b> (anything is fine) and press <b>Create</b></li>
                <li>Copy the <b>16-character code</b> shown (spaces are okay) and paste it below</li>
                <li>Press <b>Connect Mailbox</b> — done. The ERP then checks this inbox every 15 minutes for replies.</li>
            </ol>
            <p className="mt-2 text-xs text-base-content/50">
                Note: if your organisation is on Google Workspace, an admin must allow IMAP access and app passwords.
            </p>
        </div>
    </details>
);

const MailboxConnections = () => {
    const { user, isAdmin } = useAuth();
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addModal, setAddModal] = useState(false);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
    const [syncing, setSyncing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ employeeId: '', employeeName: '', emailAddress: '', appPassword: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [users, setUsers] = useState([]);
    const [gmailConfigured, setGmailConfigured] = useState(false);

    useEffect(() => {
        fetchConnections();
        if (isAdmin) fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    // Google OAuth redirects the browser back here with ?gmail=ok|error — toast once.
    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        const g = q.get('gmail');
        if (g === 'ok') toast.success('Google sending enabled ✅ The ERP can now send from this mailbox.');
        else if (g === 'error') toast.error(q.get('msg') || 'Google authorization failed');
        if (g) window.history.replaceState({}, '', window.location.pathname);
    }, []);

    const isGmailAddr = (c) => /@(gmail|googlemail)\.com$/i.test((c.emailAddress || '').toLowerCase().replace(/\s/g, ''));

    const enableGmail = async (c) => {
        try {
            const r = await api.get('/mailboxes/gmail/auth-url', { params: { mailboxId: c._id } });
            if (r.data?.url) window.location.href = r.data.url;
            else toast.error(r.data?.message || 'Could not start Google authorization');
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to start Google authorization'); }
    };

    const fetchConnections = async () => {
        try {
            setLoading(true);
            const r = await api.get('/mailboxes');
            setConnections(r.data.data || []);
            setGmailConfigured(r.data.gmailConfigured === true);
        } catch { toast.error('Failed to load mailbox connections'); }
        finally { setLoading(false); }
    };

    const fetchUsers = async () => {
        try {
            const r = await api.get('/users');
            setUsers(r.data.users || r.data.data || []);
        } catch (e) { console.error(e); }
    };

    const openAddModal = () => {
        // Non-admins always connect their own account — no picker, prefilled identity.
        setForm({
            employeeId: isAdmin ? '' : user._id,
            employeeName: isAdmin ? '' : user.name,
            emailAddress: isAdmin ? '' : (user.email || ''),
            appPassword: ''
        });
        setShowPwd(false);
        setAddModal(true);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await api.post('/mailboxes', form);
            toast.success('Mailbox connected successfully ✅');
            setAddModal(false);
            fetchConnections();
            // Wake the sidebar/dashboard counts immediately if a reply is found on sync.
            window.dispatchEvent(new Event('outreachMailChanged'));
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
        const selected = users.find(u => u._id === e.target.value);
        setForm(p => ({
            ...p,
            employeeId: e.target.value,
            employeeName: selected?.name || '',
            emailAddress: selected?.email || p.emailAddress
        }));
    };

    const formatLastSync = (lastSyncAt) => {
        if (!lastSyncAt) return 'Never';
        const dt = new Date(lastSyncAt);
        if (isNaN(dt.getTime())) return 'Never';
        // Time half is hand-formatted (12-hour, zero-padded) to match the
        // project's dd/MMM/yyyy convention — no raw locale string.
        let hours = dt.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const minutes = String(dt.getMinutes()).padStart(2, '0');
        return `${toDDMMM(dt)}, ${hours}:${minutes} ${ampm}`;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">{isAdmin ? 'Mailbox Connections' : 'My Mailbox'}</h2>
                    <p className="text-sm text-base-content/60 mt-1">
                        {isAdmin
                            ? 'Employee Gmail accounts monitored for partner replies via IMAP'
                            : 'Connect your Gmail so replies to the emails you send appear in Outreach Mail automatically, and you can reply from there'}
                    </p>
                </div>
                <button onClick={openAddModal} className="btn btn-primary gap-2">
                    <PlusCircle size={18} /> Connect Mailbox
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>
            ) : connections.length === 0 ? (
                <div className="card bg-base-200">
                    <div className="card-body items-center text-center py-10 px-6">
                        <EyeOff size={40} className="text-base-content/30 mb-3" />
                        <p className="text-base-content/60 font-medium">
                            {isAdmin ? 'No mailboxes connected yet.' : 'You haven’t connected your Gmail yet.'}
                        </p>
                        <p className="text-sm text-base-content/40 max-w-lg mb-4">
                            {isAdmin
                                ? 'Add employee Gmail accounts to enable automatic reply detection and send-from-ERP.'
                                : 'Connect it once and the ERP will watch for replies and let you send email from here.'}
                        </p>
                        <div className="w-full max-w-xl text-left">
                            <AppPasswordGuide />
                        </div>
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

                                {/* Sending capability — Gmail API (Google) is how the ERP
                                    actually delivers mail from Render; IMAP handles inbound. */}
                                {(isGmailAddr(c) || c.gmailAuthorizedAt) && (
                                    <div className="mt-3 pt-3 border-t border-base-200 flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-base-content/50 mb-1">Sending</p>
                                            {c.gmailAuthorizedAt ? (
                                                <span className="inline-flex items-center gap-1 text-sm text-success font-medium">
                                                    <CheckCircle2 size={15} /> Sends via Google
                                                </span>
                                            ) : (
                                                <span className="text-xs text-base-content/50">
                                                    Replies still auto-import. Connect Google so you can send from the ERP.
                                                </span>
                                            )}
                                        </div>
                                        {!c.gmailAuthorizedAt && gmailConfigured && (
                                            <button onClick={() => enableGmail(c)}
                                                className="btn btn-sm btn-outline btn-primary gap-1 shrink-0">
                                                <KeyRound size={14} /> Enable Google sending
                                            </button>
                                        )}
                                    </div>
                                )}
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
                            <h3 className="font-bold text-lg">{isAdmin ? 'Connect Employee Mailbox' : 'Connect Your Gmail'}</h3>
                            <button onClick={() => setAddModal(false)} className="btn btn-sm btn-ghost btn-circle"><X size={18} /></button>
                        </div>

                        <div className="mb-4">
                            <AppPasswordGuide />
                        </div>

                        <form onSubmit={handleAdd} className="space-y-4">
                            {isAdmin && (
                                <div className="form-control">
                                    <label className="label"><span className="label-text font-medium">Employee</span></label>
                                    <select className="select select-bordered" onChange={handleUserSelect} defaultValue="">
                                        <option value="" disabled>Select employee...</option>
                                        {users.map(u => <option key={u._id} value={u._id}>{u.name} — {u.email}</option>)}
                                    </select>
                                </div>
                            )}

                            {!isAdmin && (
                                <div className="form-control">
                                    <label className="label"><span className="label-text font-medium">Connecting your account</span></label>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-base-200 rounded-lg text-sm">
                                        <span className="font-semibold">{user.name}</span>
                                        <span className="text-base-content/50 truncate">{user.email}</span>
                                    </div>
                                </div>
                            )}

                            <div className="form-control">
                                <label className="label"><span className="label-text font-medium">Gmail Address</span></label>
                                <input type="email" className="input input-bordered" placeholder="you@gmail.com"
                                    value={form.emailAddress} onChange={e => setForm(p => ({ ...p, emailAddress: e.target.value }))} required />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">App Password</span>
                                    <a href="https://myaccount.google.com/apppasswords" target="_blank" className="label-text-alt link link-primary" rel="noopener noreferrer">
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
                                This will stop automatic reply detection and send-from-ERP for this mailbox.
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
