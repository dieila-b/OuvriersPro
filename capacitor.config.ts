// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  // ✅ indispensable : empêche Capacitor de router en "path" et force un routing stable
  android: {
    allowMixedContent: true,
  },

  // ✅ important : évite que Capacitor “reload” quand l’URL change
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
