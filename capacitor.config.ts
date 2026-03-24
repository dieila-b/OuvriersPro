import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  server: {
    url: "https://0513bd25-b532-4ad1-87bd-d54c9a943029.lovableproject.com",
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
    StatusBar: {
      overlaysWebView: false,
      style: "LIGHT",
      backgroundColor: "#FFFFFFFF",
    },
  },
};

export default config;
