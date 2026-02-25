// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const DEV_PORT = 5173; // 👈 change si ton Vite tourne ailleurs

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  android: {
    allowMixedContent: true,
  },

  // ✅ DEV Emulator: charge Vite depuis le PC via 10.0.2.2
  server: {
    url: `http://10.0.2.2:${DEV_PORT}/#/`,
    cleartext: true,
  },

  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
