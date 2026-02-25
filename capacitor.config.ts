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

  // ✅ Plan B: adb reverse -> 127.0.0.1 côté Android
  server: {
    url: `http://127.0.0.1:${DEV_PORT}/#/`,
    cleartext: true,
  },

  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
