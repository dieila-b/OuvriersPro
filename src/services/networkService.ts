// src/services/networkService.ts
import { useSyncExternalStore } from "react";

export type AppNetworkStatus = {
  connected: boolean;
  connectionType: string;
  initialized: boolean;
};

type Listener = () => void;

type CapacitorNetworkModule = {
  Network: {
    getStatus: () => Promise<{
      connected: boolean;
      connectionType: string;
    }>;
    addListener: (
      eventName: "networkStatusChange",
      listener: (status: { connected: boolean; connectionType: string }) => void
    ) => Promise<{
      remove: () => Promise<void>;
    }>;
  };
};

class NetworkService {
  private status: AppNetworkStatus = {
    connected: true,
    connectionType: "unknown",
    initialized: false,
  };

  private listeners = new Set<Listener>();
  private nativeListenerCleanup: null | (() => Promise<void>) = null;
  private browserOnlineHandler: null | (() => void) = null;
  private browserOfflineHandler: null | (() => void) = null;
  private initPromise: Promise<void> | null = null;

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  private setStatus(next: Partial<AppNetworkStatus>) {
    this.status = {
      ...this.status,
      ...next,
    };
    this.emit();
  }

  private async getCapacitorNetwork(): Promise<CapacitorNetworkModule["Network"] | null> {
    try {
      const mod = (await import("@capacitor/network")) as CapacitorNetworkModule;
      return mod.Network;
    } catch (error) {
      console.warn("[networkService] @capacitor/network indisponible, fallback navigateur.", error);
      return null;
    }
  }

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const Network = await this.getCapacitorNetwork();

      if (Network) {
        try {
          const status = await Network.getStatus();

          this.setStatus({
            connected: status.connected,
            connectionType: status.connectionType,
            initialized: true,
          });

          const nativeHandle = await Network.addListener("networkStatusChange", (status) => {
            this.setStatus({
              connected: status.connected,
              connectionType: status.connectionType,
              initialized: true,
            });
          });

          this.nativeListenerCleanup = async () => {
            await nativeHandle.remove();
          };
        } catch (error) {
          console.warn("[networkService] Capacitor Network unavailable, fallback navigateur.", error);

          this.setStatus({
            connected: typeof navigator !== "undefined" ? navigator.onLine : true,
            connectionType: "unknown",
            initialized: true,
          });
        }
      } else {
        this.setStatus({
          connected: typeof navigator !== "undefined" ? navigator.onLine : true,
          connectionType: typeof navigator !== "undefined" && !navigator.onLine ? "none" : "unknown",
          initialized: true,
        });
      }

      if (typeof window !== "undefined") {
        this.browserOnlineHandler = () => {
          this.setStatus({
            connected: true,
            connectionType: this.status.connectionType === "none" ? "unknown" : this.status.connectionType || "unknown",
            initialized: true,
          });
        };

        this.browserOfflineHandler = () => {
          this.setStatus({
            connected: false,
            connectionType: "none",
            initialized: true,
          });
        };

        window.addEventListener("online", this.browserOnlineHandler);
        window.addEventListener("offline", this.browserOfflineHandler);
      }
    })();

    return this.initPromise;
  }

  async refresh() {
    const Network = await this.getCapacitorNetwork();

    if (Network) {
      try {
        const status = await Network.getStatus();
        this.setStatus({
          connected: status.connected,
          connectionType: status.connectionType,
          initialized: true,
        });
        return;
      } catch {
        // fallback navigateur juste en dessous
      }
    }

    this.setStatus({
      connected: typeof navigator !== "undefined" ? navigator.onLine : true,
      connectionType: typeof navigator !== "undefined" && !navigator.onLine ? "none" : "unknown",
      initialized: true,
    });
  }

  getStatus(): AppNetworkStatus {
    return this.status;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async destroy() {
    try {
      if (this.nativeListenerCleanup) {
        await this.nativeListenerCleanup();
      }
    } catch (error) {
      console.warn("[networkService] cleanup native listener failed", error);
    }

    if (typeof window !== "undefined") {
      if (this.browserOnlineHandler) {
        window.removeEventListener("online", this.browserOnlineHandler);
      }
      if (this.browserOfflineHandler) {
        window.removeEventListener("offline", this.browserOfflineHandler);
      }
    }

    this.nativeListenerCleanup = null;
    this.browserOnlineHandler = null;
    this.browserOfflineHandler = null;
    this.initPromise = null;
  }
}

export const networkService = new NetworkService();

export function useNetworkStatus() {
  return useSyncExternalStore(
    (listener) => networkService.subscribe(listener),
    () => networkService.getStatus(),
    () => networkService.getStatus()
  );
}
