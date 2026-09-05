import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Mail, Eye, Send, Paperclip, Check, X, AlertCircle, RefreshCw, FileText, ExternalLink } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import Pagination from '../../components/Pagination';
import FilterBar from '../../components/FilterBar';
import { toDDMMM } from '../../utils/dateFormat';
import { stripQuotedReply } from '../../utils/emailQuote';
import { conversationGmailLink } from '../../utils/gmailLink';

const STATUS_BADGES = {
    'Not Sent': 'badge-neutral',
    'Sent': 'badge-primary',
    'Reply Received': 'badge-success',
    'Replied': 'badge-info',
    'Closed': 'badge-ghost'
};

const OUTREACH_STATUSES = ['Not Sent', 'Sent', 'Reply Received', 'Replied', 'Closed'];

// Sort dropdown labels → { sortBy, sortOrder }. '' / 'Newest added' is the server default.
const SORT_MAP = {
    '': ['createdAt', 'desc'],
    'Newest added': ['createdAt', 'desc'],
    'Oldest added': ['createdAt', 'asc'],
    'Newest activity': ['lastActivityAt', 'desc'],
    'Oldest activity': ['lastActivityAt', 'asc'],
    'University A-Z': ['university', 'asc']
};

// "Date filter is" labels → aggregation dateField.
const DATE_FIELD_MAP = {
    'Last activity': 'lastActivityAt',
    'Date added': 'createdAt'
};

// ── Email Thread & Composer Component ──────────────────────────────────────────
const EmailThreadModal = ({ isOpen, onClose, recordId, onRefreshList }) => {
    const { user } = useAuth();
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [signature, setSignature] = useState(localStorage.getItem('outreach_signature') || '');
    const [attachments, setAttachments] = useState([]);
    const [sending, setSending] = useState(false);
    const [mailboxHint, setMailboxHint] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen && recordId) {
            fetchRecordDetails();
            markAsRead();
        }
    }, [isOpen, recordId]);

    const fetchRecordDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/outreach-new/${recordId}`);
            const data = res.data.data;
            setRecord(data);
            
            // Set default subject if empty
            if (data.emails && data.emails.length > 0) {
                const lastEmail = data.emails[data.emails.length - 1];
                setSubject(lastEmail.subject.startsWith('Re:') ? lastEmail.subject : `Re: ${lastEmail.subject}`);
            } else {
                setSubject(`Academic Collaboration Interest — ${data.university}`);
            }
        } catch {
            toast.error('Failed to load thread history');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async () => {
        try {
            await api.put(`/outreach-new/${recordId}/mark-read`);
            if (onRefreshList) onRefreshList();
        } catch (e) {
            console.error('Failed to mark as read:', e);
        }
    };

    const handleFileChange = (e) => {
        setAttachments(Array.from(e.target.files));
    };

    const handleSendEmail = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !body.trim()) {
            return toast.error('Subject and Body are required');
        }

        setSending(true);
        setMailboxHint(false);
        const formData = new FormData();
        formData.append('subject', subject);
        formData.append('body', body);
        formData.append('signature', signature);
        attachments.forEach(file => {
            formData.append('attachments', file);
        });

        try {
            // Save signature to localstorage for future emails
            localStorage.setItem('outreach_signature', signature);

            await api.post(`/outreach-new/${recordId}/send-email`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Email sent successfully! ✈️');
            setBody('');
            setAttachments([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            // Reload thread details
            await fetchRecordDetails();
            if (onRefreshList) onRefreshList();
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to send email';
            setMailboxHint(/no active mailbox/i.test(msg));
            toast.error(msg);
        } finally {
            setSending(false);
        }
    };

    const handleSendWithGmail = async () => {
        if (!subject.trim() || !body.trim()) {
            return toast.error('Subject and Body are required to log and open Gmail');
        }

        setSending(true);
        try {
            // Log sent mail in the ERP database thread
            await api.post(`/outreach-new/${recordId}/log-sent-email`, { subject, body });

            // Clear editor body
            setBody('');

            // Open Gmail compose tab with pre-filled inputs
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(record.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.open(gmailUrl, '_blank');

            toast.success('Email logged and Gmail composer opened! 📬');

            // Reload thread history details
            await fetchRecordDetails();
            if (onRefreshList) onRefreshList();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to log and redirect to Gmail');
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    const gmailThreadHref = conversationGmailLink(record?.emails);

    return (
        <dialog open className="modal modal-open">
            <div className="modal-box max-w-5xl h-[85vh] flex flex-col p-6 rounded-2xl bg-base-100 shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-base-200">
                    <div>
                        <h3 className="font-bold text-xl flex items-center gap-2">
                            <Mail className="text-primary animate-pulse" size={24} />
                            {record?.university || 'Loading thread...'}
                        </h3>
                        <p className="text-xs text-base-content/60 mt-0.5">
                            {record?.contactName ? `${record.contactName} (${record.contactPerson}) · ` : ''}
                            <span className="font-semibold text-primary">{record?.email}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex justify-center items-center">
                        <span className="loading loading-spinner loading-lg text-primary"></span>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col md:flex-row gap-6 mt-4 overflow-hidden">
                        {/* Left Side: Conversation Thread */}
                        <div className="flex-1 flex flex-col border border-base-200 rounded-xl overflow-hidden bg-base-50">
                            <div className="bg-base-200 px-4 py-2 font-semibold text-sm flex justify-between items-center border-b border-base-300">
                                <span>Conversation Thread</span>
                                <div className="flex items-center gap-2">
                                    {gmailThreadHref && (
                                        <a
                                            href={gmailThreadHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Open the real conversation in Gmail"
                                            className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold"
                                        >
                                            <ExternalLink size={12} />
                                            Open in Gmail
                                        </a>
                                    )}
                                    <span className="badge badge-sm badge-outline">{record?.emails?.length || 0} messages</span>
                                </div>
                            </div>
                            
                            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                                {(!record?.emails || record.emails.length === 0) ? (
                                    <div className="h-full flex flex-col justify-center items-center text-base-content/40 py-12">
                                        <Mail size={48} className="mb-2 opacity-50" />
                                        <p className="font-medium">No emails logged yet</p>
                                        <p className="text-xs">Use the composer on the right to send the first email.</p>
                                    </div>
                                ) : (
                                    record.emails.map((mail, idx) => {
                                        const isSent = mail.direction === 'sent';
                                        const dt = new Date(mail.sentAt);
                                        const sentStamp = isNaN(dt.getTime())
                                            ? ''
                                            : `(${toDDMMM(dt)}, ${dt.toLocaleString('en-IN').split(', ').slice(1).join(', ')})`;
                                        return (
                                            <div key={idx} className={`chat ${isSent ? 'chat-end' : 'chat-start'}`}>
                                                <div className="chat-header text-xs text-base-content/50 mb-1 flex items-center gap-1.5">
                                                    <span className="font-bold text-base-content">{isSent ? (mail.sentByName || 'Me') : record.university}</span>
                                                    <span>{sentStamp}</span>
                                                </div>
                                                <div className={`chat-bubble text-sm max-w-[85%] border shadow-sm ${
                                                    isSent 
                                                        ? 'bg-primary text-primary-content border-primary-focus' 
                                                        : 'bg-base-100 text-base-content border-base-300'
                                                }`}>
                                                    <p className="font-semibold text-xs opacity-75 border-b border-current/15 pb-1 mb-1">
                                                        Subject: {mail.subject}
                                                    </p>
                                                    {/* Received replies carry a verbatim quote of the original — strip
                                                        it so the thread reads "Yes" instead of repeating our sent bubble. */}
                                                    <div className="whitespace-pre-wrap break-words">
                                                        {mail.direction === 'received' ? stripQuotedReply(mail.body) : mail.body}
                                                    </div>
                                                    
                                                    {/* Attachments inside bubble */}
                                                    {mail.attachments && mail.attachments.length > 0 && (
                                                        <div className={`mt-3 pt-2 border-t text-xs flex flex-wrap gap-2 ${
                                                            isSent ? 'border-primary-content/20' : 'border-base-content/10'
                                                        }`}>
                                                            {mail.attachments.map((att, aIdx) => (
                                                                <a 
                                                                    key={aIdx} 
                                                                    href={`${api.defaults.baseURL.replace(/\/api$/, '')}${att.path}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors hover:underline ${
                                                                        isSent 
                                                                            ? 'bg-primary-focus text-primary-content border-primary-content/20' 
                                                                            : 'bg-base-200 text-base-content border-base-content/15'
                                                                    }`}
                                                                >
                                                                    <Paperclip size={12} />
                                                                    <span className="truncate max-w-[120px]">{att.filename}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Right Side: Email Composer */}
                        <div className="w-full md:w-96 flex flex-col border border-base-200 rounded-xl overflow-hidden bg-base-100">
                            <div className="bg-base-200 px-4 py-2 font-semibold text-sm border-b border-base-300 flex items-center gap-1.5">
                                <Send size={14} className="text-primary" />
                                <span>Compose Message</span>
                            </div>

                            <form onSubmit={handleSendEmail} className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text text-xs font-semibold">Subject</span></label>
                                    <input 
                                        type="text" 
                                        className="input input-bordered input-sm w-full font-medium" 
                                        placeholder="Email Subject" 
                                        value={subject} 
                                        onChange={e => setSubject(e.target.value)} 
                                        required 
                                        disabled={sending}
                                    />
                                </div>

                                <div className="form-control flex-1">
                                    <label className="label py-1"><span className="label-text text-xs font-semibold">Message Body</span></label>
                                    <textarea 
                                        className="textarea textarea-bordered textarea-sm w-full flex-1 min-h-[140px] font-sans" 
                                        placeholder="Write your email body here..." 
                                        value={body} 
                                        onChange={e => setBody(e.target.value)} 
                                        required 
                                        disabled={sending}
                                    ></textarea>
                                </div>

                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text text-xs font-semibold">Your Signature</span></label>
                                    <textarea 
                                        className="textarea textarea-bordered textarea-xs w-full h-16 font-sans text-xs" 
                                        placeholder="e.g. Best regards,&#10;Dr. Jane Doe&#10;DSU International Office" 
                                        value={signature} 
                                        onChange={e => setSignature(e.target.value)} 
                                        disabled={sending}
                                    ></textarea>
                                </div>

                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text text-xs font-semibold">Attachments</span></label>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        multiple 
                                        onChange={handleFileChange} 
                                        className="file-input file-input-bordered file-input-xs w-full"
                                        disabled={sending}
                                    />
                                    {attachments.length > 0 && (
                                        <p className="text-[10px] text-base-content/60 mt-1">
                                            {attachments.length} file(s) selected
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2 mt-2">
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary btn-sm w-full gap-2"
                                        disabled={sending}
                                    >
                                        {sending ? (
                                            <>
                                                <span className="loading loading-spinner loading-xs" />
                                                Sending via ERP...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={14} />
                                                Send via ERP (SMTP)
                                            </>
                                        )}
                                    </button>

                                    <button 
                                        type="button" 
                                        onClick={handleSendWithGmail}
                                        className="btn btn-outline btn-sm w-full gap-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500"
                                        disabled={sending}
                                    >
                                        <Mail size={14} />
                                        Compose in Gmail
                                    </button>
                                    {mailboxHint && (
                                        <p className="text-[11px] text-error flex items-start gap-1 mt-1">
                                            <AlertCircle size={13} className="shrink-0 mt-0.5" />
                                            <span>
                                                No mailbox linked to your account yet.&nbsp;
                                                <Link to="/mailbox-connections" className="link link-primary">Connect it in Mailbox settings</Link>
                                                , or use Compose in Gmail above.
                                            </span>
                                        </p>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            <form method="dialog" className="modal-backdrop" onClick={onClose} />
        </dialog>
    );
};

// ── Main Page Component ───────────────────────────────────────────────────────
const OutreachNewList = () => {
    const { user, isAdmin } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, notSent: 0, sent: 0, replyReceived: 0, replied: 0, unread: 0 });
    const [statsLoading, setStatsLoading] = useState(true);
    const [countries, setCountries] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [importModal, setImportModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [threadModal, setThreadModal] = useState({ isOpen: false, recordId: null });

    const [filters, setFilters] = useState({
        search: '',
        country: '',
        outreachStatus: '',
        hasUnreadReply: '',
        dateField: 'Last activity',
        startDate: '',
        endDate: '',
        sort: ''
    });
    const debouncedSearch = useDebounce(filters.search, 500);

    useEffect(() => {
        fetchRecords();
        fetchStats();
        fetchCountries();
    }, [currentPage, itemsPerPage, debouncedSearch, filters.country, filters.outreachStatus, filters.hasUnreadReply, filters.dateField, filters.startDate, filters.endDate, filters.sort]);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const [sortBy, sortOrder] = SORT_MAP[filters.sort] || SORT_MAP[''];
            const res = await api.get('/outreach-new', {
                params: {
                    page: currentPage,
                    limit: itemsPerPage,
                    search: debouncedSearch,
                    country: filters.country,
                    outreachStatus: filters.outreachStatus,
                    hasUnreadReply: filters.hasUnreadReply,
                    dateField: DATE_FIELD_MAP[filters.dateField] || '',
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    sortBy,
                    sortOrder
                }
            });
            setRecords(res.data.data || []);
            setTotalItems(res.data.pagination?.total || 0);
            setTotalPages(res.data.pagination?.pages || 0);
        } catch {
            toast.error('Error fetching outreach data');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            // Cheap single countDocuments call; also feeds the sidebar unread pill
            // and the Dashboard "waiting on you" strip via a window event.
            const res = await api.get('/outreach-new/stats');
            setStats(res.data.data || { total: 0, notSent: 0, sent: 0, replyReceived: 0, replied: 0, unread: 0 });
            window.dispatchEvent(new Event('outreachMailChanged'));
        } catch (e) {
            console.error(e);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchCountries = async () => {
        try {
            // Dedicated distinct-country endpoint — no more pulling up to 5000 rows
            // just to build the dropdown.
            const res = await api.get('/outreach-new/countries');
            setCountries(res.data.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/outreach-new/${deleteModal.item._id}`, { data: { reason } });
            toast.success('Outreach record deleted successfully ✅');
            setDeleteModal({ isOpen: false, item: null });
            fetchRecords();
            fetchStats();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error deleting record');
        }
    };

    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            country: '',
            outreachStatus: '',
            hasUnreadReply: '',
            dateField: 'Last activity',
            startDate: '',
            endDate: '',
            sort: ''
        });
        setCurrentPage(1);
    };

    // Shared toggle behind the Awaiting Reply / Not Contacted quick controls: clicking
    // the active one clears it; clicking the other swaps the status filter. Mirrors the
    // FilterBar quick-chip behaviour so both stay in sync.
    const toggleOutreachStatus = (value) => {
        handleFilterChange({ outreachStatus: filters.outreachStatus === value ? '' : value });
    };

    const handleExportCSV = async () => {
        try {
            // Get all items to export
            const res = await api.get('/outreach-new', { params: { limit: 5000 } });
            const data = res.data.data || [];
            if (data.length === 0) return toast.error('No records to export');

            // Format records
            const headers = ['University', 'Country', 'Contact Name', 'Contact Email', 'Outreach Status', 'Unread Reply', 'Notes'];
            const rows = data.map(r => [
                r.university,
                r.country,
                r.contactName || '',
                r.email,
                r.outreachStatus,
                r.hasUnreadReply ? 'Yes' : 'No',
                r.notes || ''
            ]);

            const csvContent = "data:text/csv;charset=utf-8," 
                + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "outreach-new-export.csv");
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully ✅');
        } catch {
            toast.error('Failed to export CSV');
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Outreach Mail</h1>
                    <p className="text-base-content/70 mt-2">Email university partners and reply to them from here — their replies appear automatically in each conversation</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none">
                        <Upload size={18} /> Import XLSX
                    </button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none">
                        <Download size={18} /> Export CSV
                    </button>
                    <Link to="/outreach-new/new" className="btn btn-primary flex-1 md:flex-none">
                        <Plus size={18} /> Add Outreach
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card bg-base-100 shadow border border-base-200">
                    <div className="card-body p-4 flex flex-row items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary"><FileText size={24} /></div>
                        <div>
                            <p className="text-xs text-base-content/60 font-semibold uppercase">Total Database</p>
                            <p className="text-2xl font-bold mt-0.5">{statsLoading ? '...' : stats.total}</p>
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => toggleOutreachStatus('Not Sent')}
                    aria-pressed={filters.outreachStatus === 'Not Sent'}
                    className={`card bg-base-100 shadow border border-base-200 text-left cursor-pointer transition ${filters.outreachStatus === 'Not Sent' ? 'ring-2 ring-neutral border-neutral' : 'hover:border-base-300'}`}
                >
                    <div className="card-body p-4 flex flex-row items-center gap-4">
                        <div className="p-3 bg-neutral/10 rounded-xl text-neutral"><Mail size={24} /></div>
                        <div>
                            <p className="text-xs text-base-content/60 font-semibold uppercase">Not Contacted</p>
                            <p className="text-2xl font-bold mt-0.5">{statsLoading ? '...' : stats.notSent}</p>
                        </div>
                    </div>
                </button>
                <div className="card bg-base-100 shadow border border-base-200">
                    <div className="card-body p-4 flex flex-row items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary"><Mail size={24} /></div>
                        <div>
                            <p className="text-xs text-base-content/60 font-semibold uppercase">Contacted</p>
                            <p className="text-2xl font-bold mt-0.5">{statsLoading ? '...' : stats.sent + stats.replyReceived + stats.replied}</p>
                            <p className="text-[11px] text-base-content/50">{statsLoading ? '' : `${stats.replied} replied`}</p>
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => toggleOutreachStatus('Reply Received')}
                    aria-pressed={filters.outreachStatus === 'Reply Received'}
                    className={`card bg-base-100 shadow border border-base-200 text-left cursor-pointer transition ${filters.outreachStatus === 'Reply Received' ? 'ring-2 ring-success border-success' : 'hover:border-base-300'}`}
                >
                    <div className="card-body p-4 flex flex-row items-center gap-4">
                        <div className="p-3 bg-success/10 rounded-xl text-success"><Check size={24} /></div>
                        <div>
                            <p className="text-xs text-base-content/60 font-semibold uppercase">Awaiting Reply</p>
                            <p className="text-2xl font-bold mt-0.5 text-success">{statsLoading ? '...' : stats.replyReceived}</p>
                            <p className="text-[11px] text-base-content/50">{statsLoading ? '' : `${stats.unread} unread`}</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Filters */}
            <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                showCountryFilter
                showStatusFilter={false}
                showDateFilter
                countries={countries}
                selectFilters={[
                    { key: 'outreachStatus', label: 'Outreach Status', placeholder: 'All Statuses', options: OUTREACH_STATUSES },
                    { key: 'dateField', label: 'Date filter is', placeholder: 'Last activity', options: ['Last activity', 'Date added'] },
                    { key: 'sort', label: 'Sort by', placeholder: 'Newest added', options: ['Newest activity', 'Oldest activity', 'Oldest added', 'University A-Z'] }
                ]}
                quickFilters={[
                    { key: 'outreachStatus', value: 'Reply Received', label: 'Awaiting reply' },
                    { key: 'hasUnreadReply', value: 'true', label: 'Unread only' }
                ]}
            />

            {/* Table */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra text-sm">
                            <thead>
                                <tr>
                                    <th>University</th>
                                    <th>Country</th>
                                    <th>Contact Email</th>
                                    <th>Outreach Status</th>
                                    <th>Last Activity</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && records.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8"><span className="loading loading-spinner loading-md"></span></td></tr>
                                ) : records.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8">No outreach records found.</td></tr>
                                ) : records.map(item => (
                                    <tr key={item._id} className={item.hasUnreadReply ? 'bg-info/5 font-semibold' : ''}>
                                        <td className="font-semibold flex items-center gap-2">
                                            {item.university}
                                            {item.hasUnreadReply && (
                                                <span className="badge badge-error badge-xs animate-bounce" title="New unread reply!">NEW REPLY</span>
                                            )}
                                        </td>
                                        <td>{item.country}</td>
                                        <td>{item.email}</td>
                                        <td>
                                            <span className={`badge badge-sm whitespace-nowrap ${STATUS_BADGES[item.outreachStatus] || 'badge-ghost'}`}>
                                                {item.outreachStatus}
                                            </span>
                                        </td>
                                        <td className="text-xs text-base-content/60">
                                            {item.lastActivityAt ? toDDMMM(item.lastActivityAt) : 'No communication yet'}
                                        </td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                <button 
                                                    onClick={() => setThreadModal({ isOpen: true, recordId: item._id })} 
                                                    className={`btn btn-sm gap-1 ${item.hasUnreadReply ? 'btn-error text-white' : 'btn-info'}`}
                                                    title="View Conversation & Reply"
                                                >
                                                    <Mail size={16} />
                                                    {item.hasUnreadReply ? 'Reply (New)' : 'Thread'}
                                                </button>
                                                <Link 
                                                    to={`/outreach-new/edit/${item._id}`} 
                                                    className="btn btn-warning btn-sm"
                                                    title="Edit Info"
                                                >
                                                    <Edit size={16} />
                                                </Link>
                                                <button 
                                                    onClick={() => setDeleteModal({ isOpen: true, item })} 
                                                    className="btn btn-error btn-sm"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalItems > 0 && (
                        <Pagination 
                            currentPage={currentPage} 
                            totalPages={totalPages} 
                            totalItems={totalItems} 
                            itemsPerPage={itemsPerPage} 
                            onPageChange={setCurrentPage} 
                            onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }} 
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            <ImportModal 
                isOpen={importModal} 
                onClose={() => setImportModal(false)} 
                onSuccess={() => { fetchRecords(); fetchStats(); }} 
                moduleName="outreach-new" 
            />

            <DeleteConfirmModal 
                isOpen={deleteModal.isOpen} 
                onClose={() => setDeleteModal({ isOpen: false, item: null })} 
                onConfirm={handleDelete} 
                itemName={deleteModal.item?.university} 
                requireReason={false} 
            />

            <EmailThreadModal 
                isOpen={threadModal.isOpen} 
                onClose={() => setThreadModal({ isOpen: false, recordId: null })} 
                recordId={threadModal.recordId} 
                onRefreshList={() => { fetchRecords(); fetchStats(); }} 
            />
        </div>
    );
};

export default OutreachNewList;
