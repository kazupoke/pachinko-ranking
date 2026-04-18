/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // レトロパチ屋パレット
        bg: {
          base: "#0a0a14",
          panel: "#1a1a2e",
          card: "#22223a",
        },
        pachi: {
          red: "#ff0066",
          pink: "#ff4d94",
          yellow: "#ffcc00",
          green: "#00ff88",
          cyan: "#00e5ff",
          blue: "#4a6fff",
          purple: "#b066ff",
        },
        rarity: {
          n: "#b8b8c8",
          r: "#4ade80",
          sr: "#a78bfa",
          ssr: "#fbbf24",
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', '"DotGothic16"', "monospace"],
        dot: ['"DotGothic16"', '"Press Start 2P"', "sans-serif"],
      },
      boxShadow: {
        pixel: "4px 4px 0 0 rgba(0,0,0,0.7)",
        "pixel-sm": "2px 2px 0 0 rgba(0,0,0,0.7)",
        "pixel-inset": "inset 2px 2px 0 0 rgba(255,255,255,0.15), inset -2px -2px 0 0 rgba(0,0,0,0.4)",
      },
      animation: {
        blink: "blink 1s steps(2) infinite",
        shake: "shake 0.3s ease-in-out",
      },
      keyframes: {
        blink: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-2px)" },
          "75%": { transform: "translateX(2px)" },
        },
      },
    },
  },
  plugins: [],
};
