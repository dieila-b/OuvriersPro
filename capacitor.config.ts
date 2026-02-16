// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  android: {
    allowMixedContent: true,
  },

  // ✅ DEV: force l’app à charger Vite + active TapInspector via #/?tap=1
  // Ton Vite est sur http://localhost:8080 -> sur l’émulateur c’est http://10.0.2.2:8080
  server: {
    url: "http://10.0.2.2:8080/#/?tap=1",
    cleartext: true,
  },

  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
