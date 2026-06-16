import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    // ── Performance optimizations ───────────────────────────────────
    target: "es2020",                      // smaller bundles on modern mobiles
    minify: "esbuild",                     // fastest minifier
    cssMinify: true,
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          // Pre-split heavy libs so first paint is fast
          "react-vendor": ["react", "react-dom", "wouter"],
          "ui-vendor": ["framer-motion", "lucide-react"],
          "query-vendor": ["@tanstack/react-query"],
          // Lazy-loaded game catalogues — split so they don't bloat the entry chunk
          "games-aes": ["@/lib/aesGamesList", "@/lib/aesProvidersList"],
          "games-live": ["@/lib/liveGames"],
        },
      },
    },
  },
  server: {
    headers: { "Cache-Control": "no-store" },  // hot-reload friendliness
  },
});
