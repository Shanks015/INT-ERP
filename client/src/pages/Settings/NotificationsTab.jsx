import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Bell, Mail, Save } from 'lucide-react';

const NotificationsTab = () => {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        email: {
            enabled: true,
            frequency: 'instant',
            events: {
                newSubmission: true,
                approvalNeeded: true,
                statusUpdate: true
            }
        }
    });

    useEffect(() => {
        if (user?.notificationSettings) {
            setSettings(user.notificationSettings);
        }
    }, [user]);

    const handleToggle = (path, value) => {
        const newSettings = { ...settings };
        const keys = path.split('.');
        let current = newSettings;

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
        setSettings(newSettings);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const response = await api.put('/settings/me/notifications', {
                notificationSettings: settings
            });

            updateUser({ ...user, notificationSettings: response.data.data });
            toast.success('Notification settings saved successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit}>
                {/* Email Notifications */}
                <div className="card bg-base-200">
                    <div className="card-body">
                        <h3 className="card-title text-lg flex items-center gap-2">
                            <Mail size={20} />
                            Email Notifications
                        </h3>

                        {/* Enable/Disable */}
                        <div className="form-control">
                            <label className="label cursor-pointer justify-start gap-4">
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary"
                                    checked={settings.email.enabled}
                                    onChange={(e) => handleToggle('email.enabled', e.target.checked)}
                                    disabled={loading}
                                />
                                <div>
                                    <span className="label-text font-semibold">Enable Email Notifications</span>
                                    <p className="text-sm text-base-content/60">
                                        Receive updates about your activities via email
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="divider"></div>

                        {/* Frequency */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Notification Frequency</span>
                            </label>
                            <select
                                value={settings.email.frequency}
                                onChange={(e) => handleToggle('email.frequency', e.target.value)}
                                className="select select-bordered"
                                disabled={loading || !settings.email.enabled}
                            >
                                <option value="instant">Instant - Get notified immediately</option>
                                <option value="daily">Daily - Once per day digest</option>
                                <option value="weekly">Weekly - Weekly summary</option>
                            </select>
                        </div>

                        <div className="divider"></div>

                        {/* Event Types */}
                        <div>
                            <label className="label">
                                <span className="label-text font-semibold">Notify me about:</span>
                            </label>

                            <div className="space-y-3">
                                <label className="label cursor-pointer justify-start gap-4">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary"
                                        checked={settings.email.events.newSubmission}
                                        onChange={(e) => handleToggle('email.events.newSubmission', e.target.checked)}
                                        disabled={loading || !settings.email.enabled}
                                    />
                                    <div>
                                        <span className="label-text font-medium">New Submissions</span>
                                        <p className="text-sm text-base-content/60">
                                            When new data is submitted to the system
                                        </p>
                                    </div>
                                </label>

                                <label className="label cursor-pointer justify-start gap-4">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary"
                                        checked={settings.email.events.approvalNeeded}
                                        onChange={(e) => handleToggle('email.events.approvalNeeded', e.target.checked)}
                                        disabled={loading || !settings.email.enabled}
                                    />
                                    <div>
                                        <span className="label-text font-medium">Approval Needed</span>
                                        <p className="text-sm text-base-content/60">
                                            When your approval is required for an action
                                        </p>
                                    </div>
                                </label>

                                <label className="label cursor-pointer justify-start gap-4">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary"
                                        checked={settings.email.events.statusUpdate}
                                        onChange={(e) => handleToggle('email.events.statusUpdate', e.target.checked)}
                                        disabled={loading || !settings.email.enabled}
                                    />
                                    <div>
                                        <span className="label-text font-medium">Status Updates</span>
                                        <p className="text-sm text-base-content/60">
                                            When the status of items you track changes
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="alert alert-info">
                    <Bell size={20} />
                    <div>
                        <div className="font-bold">Email notifications coming soon!</div>
                        <div className="text-sm">We're working on implementing email notifications. Your preferences will be saved and applied once this feature is live.</div>
                    </div>
                </div>

                {/* Save Button */}
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

