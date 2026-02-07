// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  // ✅ Mode "wrapper web" : l'app charge toujours la dernière version Netlify
  server: {
    url: "https://proxiservices.netlify.app",
    androidScheme: "https",
    cleartext: false,
    // Optionnel mais recommandé si tu ouvres des sous-domaines
    allowNavigation: ["https://proxiservices.netlify.app", "*.netlify.app"],
  },
};

export default config;
