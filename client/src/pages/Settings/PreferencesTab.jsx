import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Palette, Calendar, Clock, Save } from 'lucide-react';

const PreferencesTab = () => {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [preferences, setPreferences] = useState({
        theme: 'light',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h'
    });
    const [previewTheme, setPreviewTheme] = useState('light');

    const themes = [
        { name: 'light', icon: '🌞', label: 'Light' },
        { name: 'bumblebee', icon: '🐝', label: 'Bumblebee' },
        { name: 'forest', icon: '🌲', label: 'Forest' },
        { name: 'lofi', icon: '📄', label: 'Lo-Fi' },
        { name: 'fantasy', icon: '✨', label: 'Fantasy' },
        { name: 'cmyk', icon: '🎨', label: 'CMYK' },
        { name: 'autumn', icon: '🍂', label: 'Autumn' },
        { name: 'acid', icon: '🌈', label: 'Acid' },
        { name: 'lemonade', icon: '🍋', label: 'Lemonade' },
        { name: 'winter', icon: '❄️', label: 'Winter' },
        { name: 'halloween', icon: '🎃', label: 'Halloween' },
        { name: 'valentine', icon: '💝', label: 'Valentine' }
    ];

    const dateFormats = [
        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '01/06/2026' },
        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '06/01/2026' },
        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2026-01-06' }
    ];

    const timeFormats = [
        { value: '12h', label: '12-hour', example: '3:45 PM' },
        { value: '24h', label: '24-hour', example: '15:45' }
    ];

    useEffect(() => {
        if (user?.preferences) {
            setPreferences({
                theme: user.preferences.theme || 'light',
                dateFormat: user.preferences.dateFormat || 'MM/DD/YYYY',
                timeFormat: user.preferences.timeFormat || '12h'
            });
            setPreviewTheme(user.preferences.theme || 'light');
        }
    }, [user]);

    const handleChange = (field, value) => {
        setPreferences({ ...preferences, [field]: value });
        if (field === 'theme') {
            setPreviewTheme(value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const response = await api.put('/settings/me/preferences', preferences);

            // Update theme immediately
            document.documentElement.setAttribute('data-theme', preferences.theme);

            updateUser({ ...user, preferences: response.data.data });
            toast.success('Preferences saved successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving preferences');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit}>
                {/* Theme Selection */}
                <div className="card bg-base-200">
                    <div className="card-body">
                        <h3 className="card-title text-lg flex items-center gap-2">
                            <Palette size={20} />
                            Theme Selection
                        </h3>

                        {/* Theme Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
                            {themes.map(theme => (
                                <button
                                    key={theme.name}
                                    type="button"
                                    onClick={() => handleChange('theme', theme.name)}
                                    className={`btn btn-sm ${preferences.theme === theme.name ? 'btn-primary' : 'btn-outline'}`}
                                >
                                    <span className="text-xl">{theme.icon}</span>
                                    <span className="hidden sm:inline">{theme.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Theme Preview */}
                        <div data-theme={previewTheme} className="card bg-base-100 shadow-lg border-2 border-base-300">
                            <div className="card-body p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-bold text-sm">Preview: {themes.find(t => t.name === previewTheme)?.label}</h4>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <div className="stat bg-primary text-primary-content rounded p-2">
                                        <div className="stat-value text-lg">123</div>
                                        <div className="stat-title text-xs opacity-80">Primary</div>
                                    </div>
                                    <div className="stat bg-secondary text-secondary-content rounded p-2">
                                        <div className="stat-value text-lg">456</div>
                                        <div className="stat-title text-xs opacity-80">Secondary</div>
                                    </div>
                                    <div className="stat bg-accent text-accent-content rounded p-2">
                                        <div className="stat-value text-lg">789</div>
                                        <div className="stat-title text-xs opacity-80">Accent</div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button type="button" className="btn btn-primary btn-sm">Primary</button>
                                    <button type="button" className="btn btn-secondary btn-sm">Secondary</button>
                                    <button type="button" className="btn btn-accent btn-sm">Accent</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Date & Time Format */}
                <div className="card bg-base-200 mt-6">
                    <div className="card-body">
                        <h3 className="card-title text-lg">Date & Time Format</h3>

                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Date Format */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text flex items-center gap-2">
                                        <Calendar size={16} />
                                        Date Format
                                    </span>
                                </label>
                                <select
                                    value={preferences.dateFormat}
                                    onChange={(e) => handleChange('dateFormat', e.target.value)}
                                    className="select select-bordered"
                                    disabled={loading}
                                >
                                    {dateFormats.map(format => (
                                        <option key={format.value} value={format.value}>
                                            {format.label} ({format.example})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Time Format */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text flex items-center gap-2">
                                        <Clock size={16} />
                                        Time Format
                                    </span>
                                </label>
                                <select
                                    value={preferences.timeFormat}
                                    onChange={(e) => handleChange('timeFormat', e.target.value)}
                                    className="select select-bordered"
                                    disabled={loading}
                                >
                                    {timeFormats.map(format => (
                                        <option key={format.value} value={format.value}>
                                            {format.label} ({format.example})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end mt-6">
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
                                Save Preferences
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PreferencesTab;
