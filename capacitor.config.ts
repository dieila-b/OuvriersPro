import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  // ✅ Live-reload: l'app mobile charge le code depuis le serveur preview
  // Supprimez ce bloc pour les builds de production (APK final)
  // INCIDENT DIAG: forceNative + start on TapTest to validate taps + version.
  server: {
    url: "https://0513bd25-b532-4ad1-87bd-d54c9a943029.lovableproject.com?forceHideBadge=true&forceNative=1&uiDebug=1&incident=1&mobileBuild=mobile-incident-2026-03-09-v1#/__tap-test?tap=1",
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
