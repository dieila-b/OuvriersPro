// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const DEV_PORT = 5173;

// ✅ Mets ici l’IP LAN de ton PC (celle accessible depuis le téléphone / émulateur)
const DEV_HOST_IP = "192.168.1.183";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  android: {
    allowMixedContent: true,
  },

  /**
   * ✅ DEV sur téléphone/émulateur :
   * - server.url doit pointer vers l'IP de ton PC (pas 127.0.0.1)
   * - NE PAS mettre "/#/" ici
   *
   * ✅ PROD :
   * - commente carrément "server" pour utiliser dist (webDir)
   */
  server: {
    url: `http://${DEV_HOST_IP}:${DEV_PORT}`,
    cleartext: true,
  },

  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
