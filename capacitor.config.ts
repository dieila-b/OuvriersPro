// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  // ✅ DEV (émulateur Android) : charge Vite + active TapInspector via HashRouter
  // 10.0.2.2 = ton PC vu depuis l'émulateur
  server: {
    url: "http://10.0.2.2:8080/#/?tap=1",
    cleartext: true,
  },

  android: {
    allowMixedContent: true,
  },

  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
