// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  server: {
    androidScheme: "https",
    hostname: "localhost",
    // cleartext: true, // uniquement si url http en dev
    // url: "http://192.168.x.x:5173", // uniquement en dev live reload
  },
};

export default config;
