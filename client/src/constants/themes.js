// Single source of truth for the ERP's offered daisyUI themes.
// MUST stay in sync with the server-side whitelist in User.preferences.theme
// (server/src/models/User.js) and the daisyui `themes` list in tailwind.config.js.
// Both the navbar ThemeSwitcher and the Settings → Preferences grid render from
// this, so every picker offers the exact same set and the theme name stored in
// user.preferences.theme always has a matching swatch here.
export const THEMES = [
    { name: 'light',      icon: '🌞', label: 'Light' },
    { name: 'bumblebee',  icon: '🐝', label: 'Bumblebee' },
    { name: 'forest',     icon: '🌲', label: 'Forest' },
    { name: 'lofi',       icon: '📄', label: 'Lo-Fi' },
    { name: 'fantasy',    icon: '✨', label: 'Fantasy' },
    { name: 'cmyk',       icon: '🎨', label: 'CMYK' },
    { name: 'autumn',     icon: '🍂', label: 'Autumn' },
    { name: 'acid',       icon: '🌈', label: 'Acid' },
    { name: 'lemonade',   icon: '🍋', label: 'Lemonade' },
    { name: 'winter',     icon: '❄️', label: 'Winter' },
    { name: 'halloween',  icon: '🎃', label: 'Halloween' },
    { name: 'valentine',  icon: '💝', label: 'Valentine' }
];

export const THEME_NAMES = THEMES.map((t) => t.name);
