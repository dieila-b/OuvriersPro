// src/components/offline/OfflineBanner.tsx
import React from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/services/networkService";

export default function OfflineBanner() {
  const { connected, initialized } = useNetworkStatus();

  if (!initialized || connected) return null;

  return (
    <div className="sticky top-0 z-[110] w-full border-b border-amber-200 bg-amber-50/95 backdrop-blur supports-[backdrop-filter]:bg-amber-50/80">
      <div className="mx-auto flex min-h-[44px] w-full max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium text-amber-900">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span className="leading-tight">
          Mode hors connexion — les données déjà synchronisées restent accessibles.
        </span>
        <RefreshCw className="h-4 w-4 shrink-0 opacity-70" />
      </div>
    </div>
  );
}
