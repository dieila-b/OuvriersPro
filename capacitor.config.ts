import type { CapacitorConfig } from "@capacitor/cli";

const isDevServer = process.env.CAP_DEV_SERVER === "true";
const devTarget = process.env.CAP_DEV_TARGET;

const devUrl =
  devTarget === "emulator"
    ? "http://10.0.2.2:5173"
    : "http://192.168.1.183:5173";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  ...(isDevServer
    ? {
        server: {
          url: devUrl,
          cleartext: true,
          allowNavigation: ["10.0.2.2", "192.168.1.183"],
        },
      }
    : {}),

  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "LIGHT",
      backgroundColor: "#FFFFFFFF",
    },
  },
};

export default config;
