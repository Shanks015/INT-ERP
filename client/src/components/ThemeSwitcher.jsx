import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';

const ThemeSwitcher = () => {
    const themes = [
        'light',
        'bumblebee',
        'forest',
        'lofi',
        //'fantasy',
        'cmyk',
        'autumn',
        'acid',
        'lemonade',
        'winter',
        'halloween',
        'valentine',

        // Commented out themes (uncomment to re-enable):
        // 'dark',
        // 'cupcake',
        // 'emerald',
        // 'corporate',
        // 'synthwave',
        // 'retro',
        // 'cyberpunk',
        // 'aqua',
        // 'garden',
        // 'pastel',
        // 'wireframe',
        // 'black',
        // 'luxury',
        // 'dracula',
        // 'business',
        // 'night',
        // 'coffee',
        // 'dim',
        // 'nord',
        // 'sunset',
    ];

    const [currentTheme, setCurrentTheme] = useState(
        localStorage.getItem('theme') || 'light'
    );

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
    }, [currentTheme]);

    const handleThemeChange = (theme) => {
        setCurrentTheme(theme);
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
                {themes.map((theme) => (
                    <li key={theme}>
                        <button
                            className={`capitalize ${currentTheme === theme ? 'active' : ''}`}
                            onClick={() => handleThemeChange(theme)}
                        >
                            {theme}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ThemeSwitcher;
