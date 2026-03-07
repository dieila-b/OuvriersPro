// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const DEV_PORT = 5173;

// IP LAN du PC (téléphone sur le même Wi-Fi)
const DEV_PHONE_HOST = "192.168.1.183";

// Host spécial Android Emulator (AVD) pour atteindre le localhost du PC
const DEV_EMULATOR_HOST = "10.0.2.2";

/**
 * CAP_DEV_TARGET:
 * - "emulator" => 10.0.2.2
 * - "phone"    => 192.168.1.183
 *
 * CAP_DEV_SERVER:
 * - "1" / "true" => active le live reload via server.url
 * - sinon        => mode normal (charge le build dist)
 */
function readEnv(name: string): string | undefined {
  try {
    const nodeEnv = process.env?.[name];
    if (typeof nodeEnv === "string" && nodeEnv.length > 0) return nodeEnv;
  } catch {
    // ignore
  }

  return undefined;
}

const CAP_DEV_TARGET = (readEnv("CAP_DEV_TARGET") || "").toLowerCase(); // "emulator" | "phone"
const CAP_DEV_SERVER = (readEnv("CAP_DEV_SERVER") || "").toLowerCase(); // "1" | "true"

const isDevServerEnabled = CAP_DEV_SERVER === "1" || CAP_DEV_SERVER === "true";

// ✅ emulator par défaut si rien n'est précisé
const DEV_HOST = CAP_DEV_TARGET === "phone" ? DEV_PHONE_HOST : DEV_EMULATOR_HOST;
const DEV_URL = `http://${DEV_HOST}:${DEV_PORT}`;

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
        server: {
          url: DEV_URL,
          cleartext: true,
          allowNavigation: [
            "10.0.2.2",
            "localhost",
            "127.0.0.1",
            "192.168.1.183",
            "169.254.104.95",
            "169.254.207.97",
          ],
        },
      }
    : {}),

  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
