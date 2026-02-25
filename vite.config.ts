import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  // ✅ OK pour Capacitor prod (file://...) : évite /assets absolu
  base: "./",

  server: {
    host: "0.0.0.0",       // ✅ FORCER IPv4 (au lieu de "::")
    port: 5173,            // ✅ aligné avec ton dev:emulator
    strictPort: true,
    cors: true,
    // Optionnel mais utile sur émulateur
    hmr: { host: "localhost" },
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"],
          query: ["@tanstack/react-query"],
          supabase: ["@supabase/supabase-js"],
          ui: ["lucide-react"],
        },
      },
    },
  },
}));
