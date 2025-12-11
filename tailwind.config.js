/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Custom colors if needed, but we rely mostly on CSS variables
            },
            animation: {
                'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
                'scale-in': 'scale-in 0.2s ease-out forwards',
                'particle-float': 'particle-float 60s linear infinite',
                'pulse-glow': 'pulse-cyan 3s infinite',
                'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
            },
        },
    },
    plugins: [],
}
