import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Palette, Save } from 'lucide-react';
import { THEMES } from '../../constants/themes';

// Appearance preferences. Theme is the per-account value stored in
// user.preferences.theme on the server and re-applied on login (AuthContext +
// index.html inline script). Selecting a swatch previews it; Save persists the
// choice — the same stored value the navbar ThemeSwitcher writes.
const PreferencesTab = () => {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [theme, setTheme] = useState('light');
    const [previewTheme, setPreviewTheme] = useState('light');

    useEffect(() => {
        const saved = user?.preferences?.theme || 'light';
        setTheme(saved);
        setPreviewTheme(saved);
    }, [user?.preferences?.theme]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const response = await api.put('/settings/me/preferences', { theme });

            // Apply immediately, then sync the context copy of the user.
            document.documentElement.setAttribute('data-theme', theme);
            updateUser({ ...user, preferences: response.data.data });
            toast.success('Preferences saved successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving preferences');
        } finally {
            setLoading(false);
        }
    };

    const previewLabel = THEMES.find((t) => t.name === previewTheme)?.label || previewTheme;

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit}>
                <div className="card bg-base-200">
                    <div className="card-body">
                        <h3 className="card-title text-lg flex items-center gap-2">
                            <Palette size={20} />
                            Theme Selection
                        </h3>
                        <p className="text-sm text-base-content/70">
                            Your theme follows your account — it is saved on the server and applied
                            on any device after you sign in.
                        </p>

                        {/* Theme Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4 mt-2">
                            {THEMES.map((t) => (
                                <button
                                    key={t.name}
                                    type="button"
                                    onClick={() => {
                                        setTheme(t.name);
                                        setPreviewTheme(t.name);
                                    }}
                                    className={`btn btn-sm ${theme === t.name ? 'btn-primary' : 'btn-outline'}`}
                                >
                                    <span className="text-xl">{t.icon}</span>
                                    <span className="hidden sm:inline">{t.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Theme Preview */}
                        <div data-theme={previewTheme} className="card bg-base-100 shadow-lg border-2 border-base-300">
                            <div className="card-body p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-bold text-sm">Preview: {previewLabel}</h4>
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

                        <p className="text-xs text-base-content/50 mt-4">
                            Dates across the ERP are always shown as dd MMM yyyy (e.g. 06 Sep 2026).
                        </p>
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
