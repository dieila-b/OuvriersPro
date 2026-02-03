// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  /**
   * IMPORTANT
   * - Ne mets PAS "server.url" ici si tu veux que l’émulateur charge le contenu packagé (dist).
   * - "server.url" est uniquement pour le mode live reload (dev) et sinon ça charge le site distant.
   */
  server: {
    androidScheme: "https",

    // ✅ À utiliser seulement si tu fais du live reload (dev)
    // Exemple :
    // url: "http://192.168.1.10:5173",
    // cleartext: true,
  },
};

export default config;
