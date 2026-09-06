import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    Reply,
    ClipboardCheck,
    CheckCircle2,
    Inbox,
    AlertTriangle,
    Mail
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

// Header bell — one bell for every authenticated user. Notifications are created
// by real in-app events (partner reply, sign-up, staged edit/delete, approve/
// reject, mailbox break) and read back via /api/notifications. The unread badge
// polls every 30 s so server-side events (the IMAP reply job) surface without a
// page reload.
const POLL_MS = 30_000;

const CATEGORY_META = {
    reply:    { icon: Reply,         label: 'Reply',          tone: 'text-primary' },
    approval: { icon: ClipboardCheck, label: 'Needs action',   tone: 'text-warning' },
    decision: { icon: CheckCircle2,  label: 'Decision',       tone: 'text-success' },
    status:   { icon: AlertTriangle, label: 'System',         tone: 'text-error' }
};

// Relative age ("5m", "3h", "2d", "14d") — the bell must NOT use the dd/MMM/yyyy
// date policy formatter, which is for record dates, not feed timestamps.
const relativeAge = (iso) => {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    return `${months}mo`;
};

const NotificationsBell = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busyAll, setBusyAll] = useState(false);
    const busyRef = useRef({}); // per-id guard against double-clicks

    // ── unread badge poll ───────────────────────────────────────────────────
    const refreshUnread = useCallback(async () => {
        if (!user) return;
        try {
            const res = await api.get('/notifications/unread-count');
            setUnread(res.data?.unread ?? 0);
        } catch (_) { /* silent — interceptor toasts real failures */ }
    }, [user]);

    useEffect(() => {
        refreshUnread();
        const id = setInterval(refreshUnread, POLL_MS);
        return () => clearInterval(id);
    }, [refreshUnread]);

    // Re-sync the badge when a notification is created in this tab (e.g. a
    // staged edit just approved by another admin).
    useEffect(() => {
        const onPending = () => refreshUnread();
        window.addEventListener('pendingCountUpdated', onPending);
        return () => window.removeEventListener('pendingCountUpdated', onPending);
    }, [refreshUnread]);

    const loadList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications');
            setItems(res.data?.data ?? []);
        } catch (_) {
            /* silent */
        } finally {
            setLoading(false);
        }
    }, []);

    const handleRowClick = async (item) => {
        if (busyRef.current[item._id]) return;
        busyRef.current[item._id] = true;
        try {
            if (!item.read) {
                await api.post(`/notifications/${item._id}/read`);
                setUnread((u) => Math.max(0, u - 1));
                setItems((list) => list.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
            }
            if (item.link) navigate(item.link);
        } catch (_) {
            /* silent — row still navigates; the interceptor surfaces failures */
        } finally {
            busyRef.current[item._id] = false;
        }
    };

    const handleMarkAll = async () => {
        if (busyAll) return;
        setBusyAll(true);
        try {
            await api.post('/notifications/read-all');
            setUnread(0);
            setItems((list) => list.map((n) => ({ ...n, read: true })));
        } catch (_) {
            /* silent */
        } finally {
            setBusyAll(false);
        }
    };

    const unseenCount = items.filter((n) => !n.read).length;

    return (
        <div className="dropdown dropdown-end">
            <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-circle"
                onClick={() => { loadList(); refreshUnread(); }}
            >
                <div className="indicator">
                    <Bell size={20} />
                    {unread > 0 && (
                        <span className="badge badge-sm badge-error indicator-item">
                            {unread > 99 ? '99+' : unread}
                        </span>
                    )}
                </div>
            </div>

            <div
                tabIndex={0}
                role="menu"
                className="dropdown-content z-[1] mt-1 w-96 max-w-[calc(100vw-2rem)] shadow-2xl bg-base-100 rounded-box overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-base-200">
                    <span className="text-sm font-semibold">Notifications</span>
                    <button
                        type="button"
                        className="btn btn-ghost btn-xs text-base-content/70"
                        onClick={handleMarkAll}
                        disabled={busyAll || unseenCount === 0}
                    >
                        Mark all read
                    </button>
                </div>

                {/* Scrollable list */}
                <div className="max-h-96 overflow-y-auto">
                    {loading && (
                        <div className="px-4 py-6 text-center text-sm text-base-content/60">
                            <span className="loading loading-spinner loading-sm" /> Loading…
                        </div>
                    )}

                    {!loading && items.length === 0 && (
                        <div className="px-4 py-10 text-center">
                            <Inbox size={28} className="mx-auto mb-2 text-base-content/40" />
                            <p className="text-sm text-base-content/60">No notifications yet</p>
                        </div>
                    )}

                    {!loading &&
                        items.map((item) => {
                            const meta = CATEGORY_META[item.category] || CATEGORY_META.status;
                            const Icon = meta.icon;
                            return (
                                <button
                                    type="button"
                                    key={item._id}
                                    className="w-full flex gap-3 px-4 py-3 text-left hover:bg-base-200 transition-colors items-start border-b border-base-300/60"
                                    onClick={() => handleRowClick(item)}
                                >
                                    <span className={`mt-0.5 ${meta.tone}`}>
                                        <Icon size={18} />
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="flex items-center justify-between gap-2">
                                            <span
                                                className={`text-sm font-medium truncate ${item.read ? 'text-base-content/60' : 'text-base-content'}`}
                                            >
                                                {item.title}
                                            </span>
                                            <span className="text-xs text-base-content/40 shrink-0">
                                                {relativeAge(item.createdAt)}
                                            </span>
                                        </span>
                                        {item.body && (
                                            <span className="block text-xs text-base-content/60 line-clamp-2 mt-0.5">
                                                {item.body}
                                            </span>
                                        )}
                                        {item.module && (
                                            <span className="inline-flex mt-1 text-[10px] uppercase tracking-wide text-base-content/40">
                                                {item.module}
                                            </span>
                                        )}
                                    </span>
                                    {!item.read && (
                                        <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                </div>

                {/* Footer */}
                <div className="border-t border-base-300">
                    <button
                        type="button"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-base-content/70 hover:bg-base-200 transition-colors"
                        onClick={() => navigate('/settings?tab=notifications')}
                    >
                        <Mail size={14} /> Notification settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationsBell;
