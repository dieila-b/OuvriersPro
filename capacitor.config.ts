// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const DEV_PORT = 5173;

// ✅ Active le live-reload DEV uniquement si CAPACITOR_DEV=1
// Windows (PowerShell): $env:CAPACITOR_DEV="1"
// mac/linux: CAPACITOR_DEV=1
const IS_DEV = process.env.CAPACITOR_DEV === "1";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  android: {
    allowMixedContent: true,
  },

  // ✅ IMPORTANT:
  // - DEV uniquement: server.url SANS "/#/"
  // - PROD: pas de server.url du tout (sinon ça casse le routing en APK release)
  ...(IS_DEV
    ? {
        server: {
          url: `http://127.0.0.1:${DEV_PORT}`,
          cleartext: true,
        },
      }
    : {}),

  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
