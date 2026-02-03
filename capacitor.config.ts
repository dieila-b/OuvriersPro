// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  /**
   * ✅ PROD / APK packagé :
   * - NE PAS mettre server.url (sinon ça charge un site distant)
   * - androidScheme doit rester "https" (valeur standard Capacitor)
   */
  server: {
    androidScheme: "https",
  },
};

export default config;
