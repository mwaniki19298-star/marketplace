import type { Config } from "tailwindcss";

// ---------------------------------------------------------------------------
// Marketplace design tokens
//
// Palette rationale: a single confident violet (--accent) against neutral
// paper/ink tones. Slate does the talking for 95% of the UI; violet is
// reserved for the actions and states that matter (primary buttons, the
// Sell action, active nav, links, focus rings). Success/warning/danger stay
// muted so they read as system feedback, not decoration.
//
// Type rationale: Fraunces (a warm, slightly editorial serif) carries the
// "community marketplace" side of the brand — greetings, prices, big
// numbers. Inter carries everything functional — labels, buttons, body
// copy — so the product still reads as fast and trustworthy. IBM Plex Mono
// is reserved for transactional data (order IDs, timestamps, request
// numbers) so those artifacts read like receipts, not prose.
// ---------------------------------------------------------------------------

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#16131F",
          soft: "#5B5567",
          faint: "#948FA0",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F7F5FB",
          sunken: "#F1EEF8",
        },
        border: {
          DEFAULT: "#E6E2F0",
          strong: "#D3CDE3",
        },
        accent: {
          DEFAULT: "#6C46E0",
          strong: "#5433B8",
          soft: "#F0EBFD",
        },
        success: {
          DEFAULT: "#16855A",
          soft: "#E5F5ED",
        },
        warning: {
          DEFAULT: "#A8631A",
          soft: "#FBF1E1",
        },
        danger: {
          DEFAULT: "#C1403F",
          soft: "#FBEAEA",
        },
      },
      fontFamily: {
        display: ["'Fraunces Variable'", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        pill: "999px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(22 19 31 / 0.04)",
        card: "0 1px 2px 0 rgb(22 19 31 / 0.04), 0 1px 1px 0 rgb(22 19 31 / 0.03)",
        raised: "0 8px 20px -6px rgb(108 70 224 / 0.35)",
        popover: "0 12px 32px -8px rgb(22 19 31 / 0.16)",
      },
      spacing: {
        18: "4.5rem",
      },
      maxWidth: {
        content: "1200px",
      },
    },
  },
  plugins: [],
} satisfies Config;
