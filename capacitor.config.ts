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

  /**
   * ✅ DEV (émulateur)
   * - Vite tourne sur ton PC : http://localhost:8080
   * - Dans l’émulateur : http://10.0.2.2:8080
   *
   * IMPORTANT:
   * - Ne mets PAS tap=1 par défaut (ça peut activer des overlays)
   * - Pour activer le traceur: ajoute #/?traceTap=1
   */
  server: {
    url: "http://10.0.2.2:8080/#/",
    cleartext: true,
  },

  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
