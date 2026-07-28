/** @type {import('tailwindcss').Config} */

// CSS vars are full oklch() colors. color-mix keeps Tailwind opacity
// modifiers like `ring/50` and `outline-ring/50` working.
const color = (variable) =>
  `color-mix(in oklch, var(${variable}) calc(<alpha-value> * 100%), transparent)`

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: color("--border"),
        input: color("--input"),
        ring: color("--ring"),
        background: color("--background"),
        foreground: color("--foreground"),
        primary: {
          DEFAULT: color("--primary"),
          foreground: color("--primary-foreground"),
        },
        secondary: {
          DEFAULT: color("--secondary"),
          foreground: color("--secondary-foreground"),
        },
        muted: {
          DEFAULT: color("--muted"),
          foreground: color("--muted-foreground"),
        },
        accent: {
          DEFAULT: color("--accent"),
          foreground: color("--accent-foreground"),
        },
        destructive: {
          DEFAULT: color("--destructive"),
          foreground: color("--destructive-foreground"),
        },
        card: {
          DEFAULT: color("--card"),
          foreground: color("--card-foreground"),
        },
        popover: {
          DEFAULT: color("--popover"),
          foreground: color("--popover-foreground"),
        },
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
    },
  },
  plugins: [],
}
