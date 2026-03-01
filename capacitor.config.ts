// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const DEFAULT_PORT = 8080;

// DEV uniquement si CAPACITOR_DEV=1
// Windows PowerShell:
//   $env:CAPACITOR_DEV="1"
//   $env:CAPACITOR_HOST="192.168.1.183"   (pour téléphone)
//   $env:CAPACITOR_PORT="8080"
//   npx cap sync android
//   npx cap open android
const IS_DEV = process.env.CAPACITOR_DEV === "1";

// Host DEV:
// - émulateur Android -> 10.0.2.2 (accès à ta machine hôte)
// - téléphone -> IP LAN de ton PC (ex: 192.168.1.183)
const DEV_HOST = process.env.CAPACITOR_HOST || "10.0.2.2";
const DEV_PORT = Number(process.env.CAPACITOR_PORT || DEFAULT_PORT);

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  android: {
    allowMixedContent: true,
  },

  // Permet au WebView de naviguer vers ton serveur LAN en DEV
  allowNavigation: [
    "localhost",
    "127.0.0.1",
    "10.0.2.2",
    "192.168.1.183",
    "*.local",
  ],

  ...(IS_DEV
    ? {
        server: {
          url: `http://${DEV_HOST}:${DEV_PORT}`,
          cleartext: true,
        },
      }
    : {}),

  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
