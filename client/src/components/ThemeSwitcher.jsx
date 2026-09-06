import { useState } from 'react';
import { Palette } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { THEMES } from '../constants/themes';

// Navbar theme picker. The theme is a per-account setting: it lives in
// user.preferences.theme on the server, is applied on login (AuthContext effect
// + the inline script in index.html), and follows the user across devices.
// Changing it here writes the SAME stored value the Settings → Preferences grid
// writes — there is no separate localStorage 'theme' key anymore.
const ThemeSwitcher = () => {
    const { user, updateUser } = useAuth();
    const [busy, setBusy] = useState(false);

    const activeTheme = user?.preferences?.theme || 'light';
    const applyTheme = (theme) => document.documentElement.setAttribute('data-theme', theme);

    const handleThemeChange = async (theme) => {
        if (busy || theme === activeTheme) return;

        applyTheme(theme); // instant visual feedback
        setBusy(true);
        try {
            const response = await api.put('/settings/me/preferences', { theme });
            updateUser({ ...user, preferences: response.data.data });
        } catch (error) {
            applyTheme(activeTheme); // revert on failure
            toast.error(error.response?.data?.message || 'Could not save theme');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
                <Palette size={20} />
            </div>
            <ul
                tabIndex={0}
                className="dropdown-content z-[1] p-2 shadow-2xl bg-base-100 rounded-box w-52 max-h-96 overflow-y-auto"
            >
                <li className="menu-title">
                    <span>Choose Theme</span>
                </li>
                {THEMES.map((theme) => (
                    <li key={theme.name}>
                        <button
                            className={`capitalize ${activeTheme === theme.name ? 'active' : ''}`}
                            onClick={() => handleThemeChange(theme.name)}
                            disabled={busy}
                        >
                            {theme.label}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ThemeSwitcher;
