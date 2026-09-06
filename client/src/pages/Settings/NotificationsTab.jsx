import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Bell, Reply, ClipboardCheck, CheckCircle2, AlertTriangle, Save } from 'lucide-react';

// In-app notification preferences. These drive the header bell (one bell for
// every account) and the per-recipient gate the emit service checks before it
// writes a Notification document. They are NOT email settings — nothing here is
// delivered outside the ERP. Persisted as User.notificationSettings.inApp; the
// server merges this block and leaves the legacy `email` block untouched.
const DEFAULT_IN_APP = {
    enabled: true,
    events: {
        reply: true,
        approval: true,
        decision: true,
        status: true
    }
};

const EVENT_DEFS = [
    {
        key: 'reply',
        icon: Reply,
        label: 'Partner replies',
        description:
            'When a partner replies on an Outreach Mail thread in a mailbox you own.'
    },
    {
        key: 'approval',
        icon: ClipboardCheck,
        label: 'Approvals & reviews',
        description:
            'New sign-ups, legacy Outreach replies to review, and edit or delete requests (shown to admins).'
    },
    {
        key: 'decision',
        icon: CheckCircle2,
        label: 'Outcomes of my requests',
        description:
            'When an edit or delete you submitted is approved or rejected.'
    },
    {
        key: 'status',
        icon: AlertTriangle,
        label: 'Mailbox & system problems',
        description:
            'When a mailbox you own stops syncing or another system issue needs attention.'
    }
];

const NotificationsTab = () => {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState(DEFAULT_IN_APP);

    useEffect(() => {
        const inApp = user?.notificationSettings?.inApp;
        if (inApp) {
            setSettings({
                enabled: inApp.enabled ?? true,
                events: {
                    ...DEFAULT_IN_APP.events,
                    ...(inApp.events || {})
                }
            });
        } else {
            setSettings(DEFAULT_IN_APP);
        }
    }, [user]);

    const setEvent = (key, value) => {
        setSettings((s) => ({
            ...s,
            events: { ...s.events, [key]: value }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.put('/settings/me/notifications', { inApp: settings });
            updateUser({ ...user, notificationSettings: response.data.data });
            toast.success('Notification settings saved');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving notification settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit}>
                {/* In-app master toggle */}
                <div className="card bg-base-200">
                    <div className="card-body">
                        <h3 className="card-title text-lg flex items-center gap-2">
                            <Bell size={20} />
                            In-app notifications
                        </h3>

                        <div className="form-control">
                            <label className="label cursor-pointer justify-start gap-4">
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary"
                                    checked={settings.enabled}
                                    onChange={(e) =>
                                        setSettings((s) => ({ ...s, enabled: e.target.checked }))
                                    }
                                    disabled={loading}
                                />
                                <div>
                                    <span className="label-text font-semibold">
                                        Show notifications in the bell
                                    </span>
                                    <p className="text-sm text-base-content/60">
                                        Appear next to your account picture in the top bar. Not
                                        email — these stay inside the ERP.
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="divider"></div>

                        {/* Event toggles */}
                        <div className="space-y-4">
                            {EVENT_DEFS.map(({ key, icon: Icon, label, description }) => (
                                <label
                                    key={key}
                                    className="label cursor-pointer justify-start gap-4"
                                >
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary"
                                        checked={settings.events[key] ?? true}
                                        onChange={(e) => setEvent(key, e.target.checked)}
                                        disabled={loading || !settings.enabled}
                                    />
                                    <div className="flex items-start gap-3">
                                        <Icon
                                            size={18}
                                            className="mt-0.5 text-base-content/50"
                                        />
                                        <div>
                                            <span className="label-text font-medium">{label}</span>
                                            <p className="text-sm text-base-content/60">
                                                {description}
                                            </p>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Save */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                            <>
                                <Save size={16} />
                                Save Settings
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NotificationsTab;
