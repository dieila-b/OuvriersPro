// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const DEV_PORT = 5173;

// ✅ Active le live-reload DEV uniquement si CAPACITOR_DEV=1
// Windows (PowerShell): $env:CAPACITOR_DEV="1"
// mac/linux: CAPACITOR_DEV=1
const IS_DEV = process.env.CAPACITOR_DEV === "1";

// ✅ Ton IP LAN (téléphone) + alias émulateur (Android Studio)
const DEV_HOST_PHONE = "192.168.1.183";
const DEV_HOST_EMULATOR = "10.0.2.2";

// ✅ Choix auto via variable (recommandé) :
// - CAPACITOR_DEV_HOST=phone   -> utilise 192.168.1.183
// - CAPACITOR_DEV_HOST=emulator-> utilise 10.0.2.2
// Si non défini, on prend "phone" par défaut (plus logique pour toi).
const DEV_TARGET = (process.env.CAPACITOR_DEV_HOST || "phone").toLowerCase();
const DEV_HOST = DEV_TARGET === "emulator" ? DEV_HOST_EMULATOR : DEV_HOST_PHONE;

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  android: {
    allowMixedContent: true,
  },

  // ✅ IMPORTANT:
  // - DEV uniquement: server.url SANS "/#/". C'est l'URL du serveur Vite sur ton PC.
  // - PROD: pas de server.url (sinon ça casse le routing en APK release)
  ...(IS_DEV
    ? {
        server: {
          url: `http://${DEV_HOST}:${DEV_PORT}`,
          cleartext: true,
          androidScheme: "http",
          allowNavigation: [
            DEV_HOST_PHONE,
            `${DEV_HOST_PHONE}:${DEV_PORT}`,
            DEV_HOST_EMULATOR,
            `${DEV_HOST_EMULATOR}:${DEV_PORT}`,
            // utile si tu changes de port ou ajoutes un backend sur 8080 :
            `${DEV_HOST_PHONE}:8080`,
          ],
        },
      }
    : {}),

  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
