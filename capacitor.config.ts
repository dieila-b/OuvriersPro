// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const DEV_PORT = 5173;

// IP LAN du PC (pour téléphone sur le même Wi-Fi)
const DEV_PHONE_HOST = "192.168.1.183";

// Host spécial Android Emulator (AVD) pour atteindre le localhost du PC
const DEV_EMULATOR_HOST = "10.0.2.2";

/**
 * CAP_DEV_TARGET:
 * - "emulator" => 10.0.2.2
 * - "phone"    => IP LAN
 *
 * CAP_DEV_SERVER:
 * - "1" / "true" => active le live reload via server.url
 * - sinon        => mode normal (charge le build dans /dist)
 */
function readEnv(name: string): string | undefined {
  // Vite (recommandé)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viteEnv = (import.meta as any)?.env?.[name];
  if (typeof viteEnv === "string" && viteEnv.length > 0) return viteEnv;

  // Node / CLI (fallback)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeEnv = (process as any)?.env?.[name];
  if (typeof nodeEnv === "string" && nodeEnv.length > 0) return nodeEnv;

  return undefined;
}

const CAP_DEV_TARGET = (readEnv("CAP_DEV_TARGET") || "").toLowerCase(); // "emulator" | "phone"
const CAP_DEV_SERVER = (readEnv("CAP_DEV_SERVER") || "").toLowerCase(); // "1" | "true" | ...

const DEV_HOST = CAP_DEV_TARGET === "emulator" ? DEV_EMULATOR_HOST : DEV_PHONE_HOST;
const DEV_URL = `http://${DEV_HOST}:${DEV_PORT}`;

// IMPORTANT: En prod, ne mets PAS server.url.
// Si tu laisses server.url en prod, l'app cherchera toujours Vite.
const isDevServerEnabled = CAP_DEV_SERVER === "1" || CAP_DEV_SERVER === "true";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  android: {
    allowMixedContent: true,
  },

  ...(isDevServerEnabled
    ? {
        // DEV live reload
        server: {
          url: DEV_URL,
          cleartext: true,
        },
      }
    : {}),

  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
