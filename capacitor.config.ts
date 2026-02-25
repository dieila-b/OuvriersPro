// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const DEV_PORT = 5173;

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  android: {
    allowMixedContent: true,
  },

  // ✅ DEV Emulator (PLAN B): adb reverse => Android accède à Vite via localhost
  server: {
    url: `http://localhost:${DEV_PORT}/#/`,
    cleartext: true,
  },

  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
