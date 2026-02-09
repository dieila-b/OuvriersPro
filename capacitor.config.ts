// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,
  // ✅ pas de server.url
};

export default config;
