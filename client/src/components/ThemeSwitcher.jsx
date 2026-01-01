import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';

const ThemeSwitcher = () => {
    const themes = [
        "light",
        "dark",
        "cupcake",
        "bumblebee",
        "emerald",
        "corporate",
        "synthwave",
        "retro",
        "cyberpunk",
        "valentine",
        "halloween",
        "garden",
        "forest",
        "aqua",
        "lofi",
        "pastel",
        "fantasy",
        "wireframe",
        "black",
        "luxury",
        "dracula",
        "cmyk",
        "autumn",
        "business",
        "acid",
        "lemonade",
        "night",
        "coffee",
        "winter",
        "dim",
        "nord",
        "sunset",
    ];

    const [currentTheme, setCurrentTheme] = useState(
        localStorage.getItem('theme') || 'corporate'
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
