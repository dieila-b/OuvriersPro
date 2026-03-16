import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,
<<<<<<< Updated upstream

  server: {
    url: "https://0513bd25-b532-4ad1-87bd-d54c9a943029.lovableproject.com",
    cleartext: true,
  },

=======
>>>>>>> Stashed changes
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  },
  plugins: {
    CapacitorHttp: {
<<<<<<< Updated upstream
      enabled: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "LIGHT",
      backgroundColor: "#FFFFFFFF",
    },
  },
=======
      enabled: true
    }
  }
>>>>>>> Stashed changes
};

export default config;
