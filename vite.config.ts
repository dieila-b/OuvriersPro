import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Dev Capacitor:
 * - Emulator Android: http://10.0.2.2:5173  (10.0.2.2 = localhost du PC)
 * - Téléphone (même Wi-Fi): http://<IP_LAN_PC>:5173
 *
 * Variables utiles:
 * - CAP_DEV_TARGET=emulator | phone
 * - CAP_DEV_HOST=192.168.1.183   (IP LAN de ton PC)
 */
export default defineConfig(({ mode }) => {
  const DEV_PORT = 5173;

  const devTarget = process.env.CAP_DEV_TARGET; // "emulator" | "phone"
  const lanHost = process.env.CAP_DEV_HOST || "192.168.1.183";
  const hmrHost = devTarget === "emulator" ? "10.0.2.2" : lanHost;

  return {
    // ✅ safe pour build Capacitor (assets relatifs)
    base: "./",

    server: {
      // ✅ indispensable: écoute sur le réseau (LAN + AVD)
      host: "0.0.0.0",
      port: DEV_PORT,
      strictPort: true,

      /**
       * ✅ IMPORTANT:
       * Sur WebView (Capacitor), le client HMR peut se tromper d'host (localhost)
       * => on force origin + HMR host
       */
      origin: `http://${hmrHost}:${DEV_PORT}`,
      hmr: {
        host: hmrHost,
        port: DEV_PORT,
        protocol: "ws",
        clientPort: DEV_PORT,
      },
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
  };
});
