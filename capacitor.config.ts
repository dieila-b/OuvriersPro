// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  /**
   * IMPORTANT
   * - Ne mets PAS "server.url" si tu veux que l’émulateur charge les assets packagés (dist).
   * - "server.url" sert UNIQUEMENT pour le live reload (dev).
   */
  server: {
    androidScheme: "https",
    // cleartext: true, // uniquement si url http en dev
    // url: "http://192.168.x.x:5173", // uniquement en dev live reload
  },
};

export default config;
