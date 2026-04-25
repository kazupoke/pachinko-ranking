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
        "card-flip": "card-flip 0.5s cubic-bezier(.4,2,.6,1) both",
        "card-pop": "card-pop 0.4s cubic-bezier(.4,2,.6,1) both",
        sparkle: "sparkle 1.4s ease-in-out infinite",
        "ssr-glow": "ssr-glow 1.6s ease-in-out infinite",
        "rainbow-bg": "rainbow-bg 2s linear infinite",
        "spin-slow": "spin 4s linear infinite",
        "rolling-pulse": "rolling-pulse 0.6s ease-in-out infinite",
        "float-up": "float-up 1.2s ease-out forwards",
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
        "card-flip": {
          "0%": { transform: "rotateY(180deg) scale(0.85)", opacity: "0" },
          "60%": { transform: "rotateY(0deg) scale(1.08)", opacity: "1" },
          "100%": { transform: "rotateY(0deg) scale(1)", opacity: "1" },
        },
        "card-pop": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "70%": { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        sparkle: {
          "0%,100%": { opacity: "0", transform: "scale(0.5) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1.2) rotate(180deg)" },
        },
        "ssr-glow": {
          "0%,100%": {
            boxShadow:
              "0 0 8px 2px rgba(251,191,36,0.7), 0 0 24px 4px rgba(255,77,148,0.4)",
          },
          "50%": {
            boxShadow:
              "0 0 16px 4px rgba(251,191,36,1), 0 0 40px 8px rgba(255,77,148,0.7)",
          },
        },
        "rainbow-bg": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "rolling-pulse": {
          "0%,100%": { transform: "scale(1)", opacity: "0.8" },
          "50%": { transform: "scale(1.06)", opacity: "1" },
        },
        "float-up": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-30px)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
