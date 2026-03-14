import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/**
 * Dev Capacitor:
 * - Emulator Android: http://10.0.2.2:5173
 * - Téléphone (même Wi-Fi): http://<IP_LAN_PC>:5173
 */
export default defineConfig(() => {
  const DEV_PORT = 5173;

  const devTarget = process.env.CAP_DEV_TARGET;
  const lanHost = process.env.CAP_DEV_HOST || "192.168.1.183";
  const hmrHost = devTarget === "emulator" ? "10.0.2.2" : lanHost;

  return {
    base: "./",

    server: {
      host: "0.0.0.0",
      port: DEV_PORT,
      strictPort: true,
      origin: `http://${hmrHost}:${DEV_PORT}`,
      hmr: {
        host: hmrHost,
        port: DEV_PORT,
        protocol: "ws",
        clientPort: DEV_PORT,
      },
    },

    plugins: [react()],

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
