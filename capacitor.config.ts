import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.proxiservices.app",
  appName: "ProxiServices",
  webDir: "dist",
  bundledWebRuntime: false,

  // ✅ important pour l’affichage + URL internes
  server: {
    androidScheme: "https",
    // Si tu veux charger le site en live pendant dev, on peut ajouter url ici (optionnel)
    // url: "https://ton-site.netlify.app",
    // cleartext: true,
  },
};

export default config;
