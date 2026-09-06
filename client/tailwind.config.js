/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [require('daisyui')],
    daisyui: {
        themes: [
            "light",
            "bumblebee",
            "forest",
            "lofi",
            "fantasy",
            "cmyk",
            "autumn",
            "acid",
            "lemonade",
            "winter",
            "halloween",
            "valentine"
        ],
        base: true,
        styled: true,
        utils: true,
    },
}
