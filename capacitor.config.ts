// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const DEV_PORT = 5173;

// Ton IP LAN PC (téléphone sur le même Wi-Fi)
const DEV_PHONE_HOST = "192.168.1.183";

// Host pour émulateur Android (accès au localhost du PC)
const DEV_EMULATOR_HOST = "10.0.2.2";

/**
 * Choix du host:
 * - CAP_DEV_TARGET=emulator => 10.0.2.2
 * - sinon => IP LAN (téléphone)
 */
const DEV_TARGET = process.env.CAP_DEV_TARGET; // "emulator" | "phone" | undefined
const DEV_HOST = DEV_TARGET === "emulator" ? DEV_EMULATOR_HOST : DEV_PHONE_HOST;

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  android: {
    allowMixedContent: true,
  },

  // DEV uniquement: commente ce bloc en PROD
  server: {
    url: `http://${DEV_HOST}:${DEV_PORT}`,
    cleartext: true,
  },

  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
