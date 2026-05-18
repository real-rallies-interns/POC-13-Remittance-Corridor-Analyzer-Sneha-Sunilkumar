/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "rr-bg":      "#030712",   // Obsidian Black — MANDATORY
        "rr-surface": "#0B1117",   // Deep Navy Grey
        "rr-border":  "#1F2937",   // Slate-800
        "rr-cyan":    "#38BDF8",   // Electric Cyan — active states
        "rr-indigo":  "#818CF8",   // Indigo — secondary overlays
        "rr-green":   "#34D399",
        "rr-amber":   "#F59E0B",
        "rr-red":     "#F87171",
        "rr-text":    "#E2E8F0",
        "rr-muted":   "#64748B",
      },
      // AFTER — Real Rails DNA
fontFamily: {
  sans: ["Space Grotesk", "system-ui", "sans-serif"],
  mono: ["IBM Plex Mono", "monospace"],
},
    },
  },
  plugins: [],
}
