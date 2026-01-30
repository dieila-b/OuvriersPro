import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ✅ Perf build (réduction chunks + cache + chargement plus rapide)
  build: {
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 800, // évite warning trop agressif, sans masquer les vrais soucis
    rollupOptions: {
      output: {
        // ✅ Découpe simple et efficace (adapté à ton app)
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
