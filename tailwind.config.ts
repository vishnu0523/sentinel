import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        background: token("background"),
        foreground: token("foreground"),
        surface: token("surface"),
        subtle: token("subtle"),
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        muted: {
          DEFAULT: token("muted"),
          foreground: token("muted-foreground"),
        },
        primary: {
          DEFAULT: token("primary"),
          foreground: token("primary-foreground"),
          soft: token("primary-soft"),
        },
        sev: {
          critical: token("sev-critical"),
          high: token("sev-high"),
          medium: token("sev-medium"),
          low: token("sev-low"),
          info: token("sev-info"),
        },
        ok: token("ok"),
        warn: token("warn"),
        bad: token("bad"),
      },
      borderRadius: { lg: "10px", md: "8px", sm: "6px" },
      fontSize: { "2xs": ["11px", "14px"] },
      boxShadow: {
        panel:
          "0 1px 0 0 hsl(var(--border) / 0.6), 0 1px 2px 0 rgb(20 24 28 / 0.04)",
        pop: "0 12px 32px -8px rgb(20 24 28 / 0.18), 0 2px 6px rgb(20 24 28 / 0.06)",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
