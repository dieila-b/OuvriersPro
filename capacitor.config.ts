import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  // ✅ Live-reload: l'app mobile charge le code depuis le serveur preview
  // Supprimez ce bloc pour les builds de production (APK final)
  server: {
    url: "https://0513bd25-b532-4ad1-87bd-d54c9a943029.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },

  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
