import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f4efe4",
        cream: "#fffaf1",
        ink: "#1c2740",
        navy: "#243656",
        terracotta: "#c45c3e",
        sage: "#2f6f4e",
        gold: "#c49212",
        line: "#e6dcc8",
        rose: "#b42318",
        muted: "#6b6458",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Hiragino Sans",
          "Hiragino Kaku Gothic ProN",
          "Noto Sans JP",
          "sans-serif",
        ],
        serif: [
          "Hiragino Mincho ProN",
          "Yu Mincho",
          "serif",
        ],
      },
      boxShadow: {
        slip: "0 12px 30px -18px rgba(28, 39, 64, 0.35)",
        plate: "0 8px 18px -12px rgba(28, 39, 64, 0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
