/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'rr-bg':      '#030712',
        'rr-surface': '#0B1117',
        'rr-border':  '#1F2937',
        'rr-cyan':    '#38BDF8',
        'rr-indigo':  '#818CF8',
        'rr-green':   '#34D399',
        'rr-amber':   '#FBBF24',
        'rr-red':     '#F87171',
        'rr-muted':   '#94A3B8',
        'rr-text':    '#E2E8F0',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}