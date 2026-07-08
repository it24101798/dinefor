/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Surface
        surface: "#fbf9f5",
        "surface-dim": "#dbdad6",
        "surface-bright": "#fbf9f5",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f5f3ef",
        "surface-container": "#efeeea",
        "surface-container-high": "#eae8e4",
        "surface-container-highest": "#e4e2de",
        
        // On Surface
        "on-surface": "#1b1c1a",
        "on-surface-variant": "#434843",
        "inverse-surface": "#30312e",
        "inverse-on-surface": "#f2f0ed",
        
        // Outline
        outline: "#737972",
        "outline-variant": "#c3c8c1",
        "surface-tint": "#4c6452",
        
        // Primary
        primary: "#051b0e",
        "on-primary": "#ffffff",
        "primary-container": "#1a3021",
        "on-primary-container": "#809985",
        "inverse-primary": "#b3cdb7",
        "primary-fixed": "#cfe9d2",
        "primary-fixed-dim": "#b3cdb7",
        "on-primary-fixed": "#0a2012",
        "on-primary-fixed-variant": "#354c3b",
        
        // Secondary
        secondary: "#296956",
        "on-secondary": "#ffffff",
        "secondary-container": "#aff0d8",
        "on-secondary-container": "#306f5c",
        "secondary-fixed": "#aff0d8",
        "secondary-fixed-dim": "#94d3bd",
        "on-secondary-fixed": "#002118",
        "on-secondary-fixed-variant": "#07513f",
        
        // Tertiary
        tertiary: "#735c00",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#cca730",
        "on-tertiary-container": "#4f3d00",
        "tertiary-fixed": "#ffe088",
        "tertiary-fixed-dim": "#e9c349",
        "on-tertiary-fixed": "#241a00",
        "on-tertiary-fixed-variant": "#574500",
        
        // Error
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        
        // Background
        background: "#fbf9f5",
        "on-background": "#1b1c1a",
        "surface-variant": "#e4e2de",
        
        // Brand
        "surface-cream": "#FDFBF7",
        "text-deep-green": "#1A3021",
        "accent-mint": "#98D8C1",
        "highlight-gold": "#D4AF37",
        "border-subtle": "#E5E1D8",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      spacing: {
        unit: "8px",
        "margin-mobile": "20px",
        "margin-desktop": "64px",
        "container-max": "1280px",
        gutter: "24px",
      },
      fontFamily: {
        "display-lg": ["Playfair Display", "serif"],
        "headline-lg": ["Playfair Display", "serif"],
        "headline-lg-mobile": ["Playfair Display", "serif"],
        "headline-md": ["Playfair Display", "serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "1.2", fontWeight: "600" }],
        "headline-lg-mobile": ["28px", { lineHeight: "1.2", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "1.2", letterSpacing: "0.05em", fontWeight: "600" }],
        "label-sm": ["12px", { lineHeight: "1.2", fontWeight: "500" }],
      },
      boxShadow: {
        ambient: "0 8px 30px rgba(26, 48, 33, 0.04)",
        "ambient-lg": "0 16px 48px rgba(26, 48, 33, 0.06)",
        "ambient-xl": "0 24px 64px rgba(26, 48, 33, 0.08)",
        "ambient-inner": "inset 0 2px 4px rgba(26, 48, 33, 0.04)",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}