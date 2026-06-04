import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Mail, Clock, Eye, XCircle, CheckCircle, Bot, PauseCircle, History, CheckCheck, X } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import SmartStatsCard from '../../components/SmartStatsCard';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';

// ── Helpers ───────────────────────────────────────────────────────────────────
const display = (v) => (v === null || v === undefined || v === '') ? 'N/A' : v;

const daysSince = (date) => {
    if (!date) return null;
    return Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));
};

const STATUS_BADGE = {
    'Not Sent':               'badge-neutral',
    'Pending Partner Review': 'badge-warning',
    'Reply Detected':         'badge-info',
    'Replied':                'badge-success',
    'Closed':                 'badge-ghost'
};

// ── Review Queue Modal ────────────────────────────────────────────────────────
const ReviewQueueModal = ({ isOpen, onClose, onRefresh }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);

    useEffect(() => {
        if (isOpen) fetchQueue();
    }, [isOpen]);

    const fetchQueue = async () => {
        try {
            setLoading(true);
            const res = await api.get('/outreach/review-queue');
            setItems(res.data.data || []);
        } catch { toast.error('Failed to load review queue'); }
        finally { setLoading(false); }
    };

    const handle = async (id, action) => {
        setProcessing(id + action);
        try {
            await api.post(`/outreach/${id}/${action}`);
            toast.success(action === 'confirm-reply' ? 'Marked as Replied ✅' : 'Returned to Pending ↩');
            fetchQueue();
            onRefresh();
        } catch { toast.error('Action failed'); }
        finally { setProcessing(null); }
    };

    if (!isOpen) return null;

    return (
        <dialog open className="modal modal-open">
            <div className="modal-box max-w-4xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <History size={20} className="text-primary" />
                        Reply Detection Queue
                        {items.length > 0 && <span className="badge badge-primary">{items.length}</span>}
                    </h3>
                    <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle"><X size={18} /></button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12 text-base-content/50">
                        <CheckCheck size={48} className="mx-auto mb-3 text-success" />
                        <p>No pending detections. All clear!</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {items.map(item => (
                            <div key={item._id} className="card bg-base-200 border border-primary/20">
                                <div className="card-body p-4">
                                    <div className="flex flex-col md:flex-row justify-between gap-3">
                                        <div className="flex-1 space-y-1">
                                            <p className="font-bold">{item.university || item.name}</p>
                                            <p className="text-sm text-base-content/60">
                                                <span className="font-medium">Reply from:</span> {item.replyFromEmail}
                                            </p>
                                            <p className="text-sm text-base-content/60">
                                                <span className="font-medium">Subject:</span> {display(item.replySubject)}
                                            </p>
                                            <p className="text-sm text-base-content/60">
                                                <span className="font-medium">Detected in:</span> {item.replyDetectedIn?.name || 'N/A'}'s inbox
                                                {' · '}
                                                {item.replyDetectedAt ? new Date(item.replyDetectedAt).toLocaleDateString('en-IN') : 'N/A'}
                                            </p>
                                            <p className="text-sm text-base-content/60">
                                                <span className="font-medium">Sent by:</span> {item.sentByEmployee?.name || item.createdBy?.name || 'N/A'}
                                            </p>
                                            {item.replyBodyContent && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-medium text-base-content/50 mb-1">Reply Content (Auto-detected):</p>
                                                    <div className="bg-base-300/60 rounded-lg p-3 max-h-40 overflow-y-auto text-xs text-base-content/80 whitespace-pre-wrap font-mono border border-base-content/10">
                                                        {item.replyBodyContent}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-row md:flex-col gap-2 items-start">
                                            <span className="badge badge-primary badge-outline badge-sm">High Confidence</span>
                                            <button
                                                onClick={() => handle(item._id, 'confirm-reply')}
                                                disabled={processing === item._id + 'confirm-reply'}
                                                className="btn btn-success btn-sm gap-1 w-full"
                                            >
                                                <CheckCircle size={14} /> Confirm
                                            </button>
                                            <button
                                                onClick={() => handle(item._id, 'reject-reply')}
                                                disabled={processing === item._id + 'reject-reply'}
                                                className="btn btn-outline btn-sm gap-1 w-full"
                                            >
                                                <XCircle size={14} /> False Positive
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <form method="dialog" className="modal-backdrop" onClick={onClose} />
        </dialog>
    );
};

// ── Reminder History Modal ────────────────────────────────────────────────────
const ReminderHistoryModal = ({ item, onClose }) => {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/outreach/${item._id}/reminders`)
            .then(r => setReminders(r.data.data || []))
            .catch(() => toast.error('Failed to load reminder history'))
            .finally(() => setLoading(false));
    }, [item._id]);

    return (
        <dialog open className="modal modal-open">
            <div className="modal-box max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Reminder History — {item.university || item.name}</h3>
                    <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle"><X size={18} /></button>
                </div>
                {loading ? <div className="flex justify-center py-8"><span className="loading loading-spinner" /></div> :
                    reminders.length === 0 ? <p className="text-center py-8 text-base-content/50">No reminders sent yet.</p> :
                    <div className="space-y-2">
                        {reminders.map((r, i) => (
                            <div key={i} className={`flex justify-between items-center p-3 rounded-lg ${r.success ? 'bg-success/10' : 'bg-error/10'}`}>
                                <div>
                                    <span className="font-semibold">Day {r.milestone} reminder</span>
                                    <span className={`badge badge-sm ml-2 ${r.triggerType === 'manual' ? 'badge-warning' : 'badge-info'}`}>{r.triggerType}</span>
                                </div>
                                <div className="text-right text-sm">
                                    <p>{new Date(r.sentAt).toLocaleDateString('en-IN')}</p>
                                    <p className={r.success ? 'text-success' : 'text-error'}>{r.success ? '✅ Sent' : '❌ Failed'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                }
            </div>
            <form method="dialog" className="modal-backdrop" onClick={onClose} />
        </dialog>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const OutreachList = () => {
    const { user, isAdmin } = useAuth();
    const [outreach, setOutreach] = useState([]);
    const [stats, setStats] = useState({ total: 0, responses: 0, nonResponses: 0 });
    const [statsLoading, setStatsLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', country: '', partnershipType: '', outreachType: '', outreachStatus: '', startDate: '', endDate: '' });
    const debouncedSearch = useDebounce(filters.search, 500);
    const [countries, setCountries] = useState([]);
    const [partnershipTypes, setPartnershipTypes] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
    const [reviewQueue, setReviewQueue] = useState(false);
    const [reminderModal, setReminderModal] = useState(null);
    const [reviewQueueCount, setReviewQueueCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    useEffect(() => { fetchOutreach(); fetchStats(); fetchFilterData(); fetchReviewQueueCount(); },
        [currentPage, itemsPerPage, debouncedSearch, filters.country, filters.partnershipType, filters.outreachStatus, filters.startDate, filters.endDate]);

    const fetchStats = async () => {
        try { setStatsLoading(true); const r = await api.get('/outreach/stats'); setStats(r.data.stats); }
        catch (e) { console.error(e); } finally { setStatsLoading(false); }
    };

    const fetchReviewQueueCount = async () => {
        if (!isAdmin) return;
        try { const r = await api.get('/outreach/review-queue'); setReviewQueueCount(r.data.total || 0); }
        catch (e) { console.error(e); }
    };

    const fetchFilterData = async () => {
        try {
            const r = await api.get('/outreach', { params: { limit: 1000 } });
            const data = r.data.data || [];
            setCountries([...new Set(data.map(o => o.country).filter(Boolean))].sort());
            setPartnershipTypes([...new Set(data.map(o => o.partnershipType).filter(Boolean))].sort());
        } catch (e) { console.error(e); }
    };

    const fetchOutreach = async () => {
        try {
            setLoading(true);
            const r = await api.get('/outreach', { params: { page: currentPage, limit: itemsPerPage, ...filters } });
            setOutreach(r.data.data || []);
            setTotalItems(r.data.pagination?.total || 0);
            setTotalPages(r.data.pagination?.pages || 0);
        } catch { toast.error('Error fetching outreach data'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/outreach/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Outreach deleted' : 'Delete request submitted');
            fetchOutreach(); fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (e) { toast.error(e.response?.data?.message || 'Error deleting'); }
    };

    const handleExportCSV = async () => {
        try {
            const r = await api.get('/outreach/export-csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([r.data]));
            const a = document.createElement('a'); a.href = url; a.setAttribute('download', 'outreach-export.csv');
            document.body.appendChild(a); a.click(); a.remove();
            toast.success('CSV exported');
        } catch { toast.error('Error exporting CSV'); }
    };

    const handleToggleAutomation = async (item) => {
        try {
            await api.put(`/outreach/${item._id}/toggle-automation`, { active: !item.automationActive });
            toast.success(`Automation ${!item.automationActive ? 'enabled' : 'disabled'}`);
            fetchOutreach();
        } catch { toast.error('Failed to toggle automation'); }
    };

    const handleFilterChange = (f) => { setFilters(p => ({ ...p, ...f })); setCurrentPage(1); };
    const handleClearFilters = () => { setFilters({ search: '', country: '', partnershipType: '', outreachType: '', outreachStatus: '', startDate: '', endDate: '' }); setCurrentPage(1); };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Outreach Data</h1>
                    <p className="text-base-content/70 mt-2">Manage outreach activities and partnerships</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {isAdmin && (
                                <button onClick={() => setReviewQueue(true)} className="btn btn-outline btn-primary flex-1 md:flex-none relative">
                                    <History size={18} /> Review Queue
                                    {reviewQueueCount > 0 && (
                                        <span className="badge badge-error badge-sm absolute -top-2 -right-2">{reviewQueueCount}</span>
                                    )}
                                </button>
                            )}
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none"><Upload size={18} /> Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none"><Download size={18} /> Export CSV</button>
                    <Link to="/outreach/new" className="btn btn-primary flex-1 md:flex-none"><Plus size={18} /> Add Outreach</Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SmartStatsCard title="Total Outreach" value={totalItems} icon={Mail} color="primary" moduleType="outreach" statType="total" moduleData={stats} loading={loading} />
                <SmartStatsCard title="Responses" value={stats.responses} icon={CheckCircle} color="success" moduleType="outreach" statType="responses" moduleData={stats} loading={statsLoading} />
                <SmartStatsCard title="No Response" value={stats.nonResponses} icon={XCircle} color="error" moduleType="outreach" statType="non-responses" moduleData={stats} loading={statsLoading} />
            </div>

            {/* Filters */}
            <FilterBar filters={filters} onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} showCountryFilter={false} showDateFilter={false}>
                <div className="form-control">
                    <label className="label"><span className="label-text">Outreach Status</span></label>
                    <select className="select select-bordered w-full" value={filters.outreachStatus || ''} onChange={e => handleFilterChange({ outreachStatus: e.target.value })}>
                        <option value="">All Statuses</option>
                        {['Not Sent', 'Pending Partner Review', 'Reply Detected', 'Replied', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text">Partnership Type</span></label>
                    <select className="select select-bordered w-full" value={filters.partnershipType || ''} onChange={e => handleFilterChange({ partnershipType: e.target.value })}>
                        <option value="">All Types</option>
                        {partnershipTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text">Country</span></label>
                    <select className="select select-bordered w-full" value={filters.country || ''} onChange={e => handleFilterChange({ country: e.target.value })}>
                        <option value="">All Countries</option>
                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </FilterBar>

            {/* Table */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra text-sm">
                            <thead>
                                <tr>
                                    <th>University</th>
                                    <th>Country</th>
                                    <th>Sent By</th>
                                    <th>Outreach Status</th>
                                    <th>Days Since Sent</th>
                                    <th>Reply Detected</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {outreach.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-8">No outreach data found.</td></tr>
                                ) : outreach.map(item => {
                                    const days = daysSince(item.sentDate);
                                    return (
                                        <tr key={item._id}>
                                            <td className="font-medium">{item.university || item.name}</td>
                                            <td>{item.country}</td>
                                            <td className="text-xs">
                                                <div>{display(item.sentByEmployee?.name)}</div>
                                                <div className="text-base-content/50">{display(item.sentFromEmail)}</div>
                                            </td>
                                            <td>
                                                {item.outreachStatus ? (
                                                    <span className={`badge badge-sm whitespace-nowrap ${STATUS_BADGE[item.outreachStatus] || 'badge-ghost'}`}>
                                                        {item.outreachStatus}
                                                    </span>
                                                ) : <span className="text-base-content/40 text-xs">N/A</span>}
                                            </td>
                                            <td>
                                                {item.sentDate ? (
                                                    <span className={`font-medium ${days >= 28 ? 'text-error' : days >= 14 ? 'text-warning' : 'text-base-content'}`}>
                                                        {days}d
                                                    </span>
                                                ) : <span className="text-base-content/40 text-xs">N/A</span>}
                                            </td>
                                            <td className="text-xs">
                                                {item.replyDetectedAt ? (
                                                    <div>
                                                        <div className="text-success font-medium">{new Date(item.replyDetectedAt).toLocaleDateString('en-IN')}</div>
                                                        <div className="text-base-content/50 truncate max-w-[120px]" title={item.replySubject}>{item.replySubject}</div>
                                                    </div>
                                                ) : <span className="text-base-content/40">N/A</span>}
                                            </td>
                                            <td>
                                                <div className="flex gap-1 flex-wrap">
                                                    <button onClick={() => setDetailModal({ isOpen: true, item })} className="btn btn-info btn-xs" title="View Details">
                                                        <Eye size={14} />
                                                    </button>
                                                    <Link to={`/outreach/edit/${item._id}`}
                                                        className={`btn btn-warning btn-xs ${item.status !== 'active' ? 'btn-disabled' : ''}`}>
                                                        <Edit size={14} />
                                                    </Link>
                                                    <button onClick={() => setDeleteModal({ isOpen: true, item })}
                                                        className={`btn btn-error btn-xs ${item.status !== 'active' ? 'btn-disabled' : ''}`}
                                                        disabled={item.status !== 'active'}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                    {isAdmin && (
                                                        <>
                                                            <button onClick={() => setReminderModal(item)} className="btn btn-ghost btn-xs" title="Reminder History">
                                                                <History size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleAutomation(item)}
                                                                className={`btn btn-xs ${item.automationActive ? 'btn-success' : 'btn-ghost'}`}
                                                                title={item.automationActive ? 'Pause automation' : 'Resume automation'}
                                                            >
                                                                {item.automationActive ? <Bot size={14} /> : <PauseCircle size={14} />}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalItems > 0 && (
                        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems}
                            itemsPerPage={itemsPerPage} onPageChange={setCurrentPage}
                            onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }} />
                    )}
                </div>
            </div>

            {/* Modals */}
            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDelete} itemName={deleteModal.item?.name} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)}
                onSuccess={() => { fetchOutreach(); fetchStats(); }} moduleName="outreach" />
            <DetailModal isOpen={detailModal.isOpen} onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item} title="Outreach Details"
                fields={[
                    { key: 'university', label: 'University' },
                    { key: 'country', label: 'Country' },
                    { key: 'contactName', label: 'Contact Name' },
                    { key: 'email', label: 'Email', type: 'email' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'partnershipType', label: 'Partnership Type' },
                    { key: 'outreachStatus', label: 'Outreach Status' },
                    { key: 'sentDate', label: 'Date Sent', type: 'date' },
                    { key: 'sentFromEmail', label: 'Sent From Email' },
                    { key: 'reply', label: 'Reply Notes' },
                    { key: 'replyFromEmail', label: 'Reply From (Auto-detected)' },
                    { key: 'replySubject', label: 'Reply Subject' },
                    { key: 'replyDetectedAt', label: 'Reply Detected At', type: 'date' },
                    { key: 'replyBodyContent', label: 'Reply Content (Auto-detected)' },
                    { key: 'detectedReplies', label: 'All Detected Replies History' },
                    { key: 'notes', label: 'Notes' },
                    { key: 'createdAt', label: 'Created At', type: 'date' },
                ]} />
            <ReviewQueueModal 
                isOpen={reviewQueue} 
                onClose={() => { 
                    setReviewQueue(false); 
                    fetchReviewQueueCount(); 
                    fetchStats(); 
                }} 
                onRefresh={() => {
                    fetchOutreach();
                    fetchStats();
                    fetchReviewQueueCount();
                }} 
            />
            {reminderModal && <ReminderHistoryModal item={reminderModal} onClose={() => setReminderModal(null)} />}
        </div>
    );
};

export default OutreachList;
