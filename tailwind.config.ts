import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F9F8F6",
          warm: "#F5F3EF",
          cool: "#F7F9FA",
        },
        ink: {
          DEFAULT: "#1A1A1A",
          light: "#4A4A4A",
          muted: "#8A8A8A",
          faint: "#C5C5C5",
        },
        matcha: {
          50: "#F4F7F5",
          100: "#E8F0EA",
          200: "#D1E0D5",
          300: "#A8C4B0",
          400: "#7C9082",
          500: "#5A7A5A",
          600: "#466046",
          700: "#384D38",
          800: "#2D3E2D",
          900: "#243024",
        },
        cloud: {
          DEFAULT: "#FFFFFF",
          shadow: "rgba(0, 0, 0, 0.04)",
          border: "rgba(0, 0, 0, 0.06)",
        },
        feedback: {
          success: "#7C9082",
          warning: "#C4A574",
          error: "#C48B7C",
        }
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        cloud: "0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 24px rgba(0, 0, 0, 0.02)",
        "cloud-lg": "0 4px 16px rgba(0, 0, 0, 0.06), 0 8px 32px rgba(0, 0, 0, 0.03)",
        float: "0 8px 30px rgba(0, 0, 0, 0.08)",
      },
      animation: {
        "ink-fill": "inkFill 0.6s ease-out forwards",
        "tilt-shake": "tiltShake 0.4s ease-out",
        "float-up": "floatUp 0.5s ease-out",
      },
      keyframes: {
        inkFill: {
          "0%": { backgroundColor: "transparent" },
          "100%": { backgroundColor: "var(--ink-fill-color)" },
        },
        tiltShake: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "20%": { transform: "rotate(-2deg)" },
          "40%": { transform: "rotate(2deg)" },
          "60%": { transform: "rotate(-1deg)" },
          "80%": { transform: "rotate(1deg)" },
        },
        floatUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
