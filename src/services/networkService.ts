// src/services/networkService.ts
import { Network } from "@capacitor/network";
import { useEffect, useSyncExternalStore } from "react";

export type AppNetworkStatus = {
  connected: boolean;
  connectionType: string;
  initialized: boolean;
};

type Listener = () => void;

const NETWORK_INIT_TIMEOUT_MS = 1200;
const NETWORK_REFRESH_TIMEOUT_MS = 1500;

class NetworkService {
  private status: AppNetworkStatus = {
    connected: typeof navigator !== "undefined" ? navigator.onLine : true,
    connectionType:
      typeof navigator !== "undefined"
        ? navigator.onLine
          ? "unknown"
          : "none"
        : "unknown",
    initialized: false,
  };

  private listeners = new Set<Listener>();
  private nativeListenerCleanup: null | (() => Promise<void>) = null;
  private browserOnlineHandler: null | (() => void) = null;
  private browserOfflineHandler: null | (() => void) = null;
  private initPromise: Promise<void> | null = null;
  private browserListenersAttached = false;
  private nativeListenersAttached = false;
  private destroyed = false;

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  private setStatus(next: Partial<AppNetworkStatus>) {
    const merged: AppNetworkStatus = {
      ...this.status,
      ...next,
    };

    const changed =
      merged.connected !== this.status.connected ||
      merged.connectionType !== this.status.connectionType ||
      merged.initialized !== this.status.initialized;

    this.status = merged;

    if (changed) {
      this.emit();
    }
  }

  private getBrowserSnapshot(): AppNetworkStatus {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    return {
      connected: isOnline,
      connectionType: isOnline ? "unknown" : "none",
      initialized: true,
    };
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: () => T): Promise<T> {
    return Promise.race<T>([
      promise,
      new Promise<T>((resolve) => {
        window.setTimeout(() => resolve(fallback()), timeoutMs);
      }),
    ]);
  }

  private attachBrowserListeners() {
    if (this.browserListenersAttached || typeof window === "undefined") return;

    this.browserOnlineHandler = () => {
      this.setStatus({
        connected: true,
        connectionType: "unknown",
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
    this.browserListenersAttached = true;
  }

  private async attachNativeListeners() {
    if (this.nativeListenersAttached) return;

    try {
      const nativeHandle = await this.withTimeout(
        Network.addListener("networkStatusChange", (status) => {
          this.setStatus({
            connected: status.connected,
            connectionType: status.connectionType,
            initialized: true,
          });
        }),
        NETWORK_INIT_TIMEOUT_MS,
        () => null as any
      );

      if (!nativeHandle || this.destroyed) return;

      this.nativeListenerCleanup = async () => {
        await nativeHandle.remove();
      };
      this.nativeListenersAttached = true;
    } catch (error) {
      console.warn("[networkService] native listener unavailable, browser fallback kept.", error);
    }
  }

  async init() {
    if (this.initPromise) return this.initPromise;

    this.destroyed = false;

    this.initPromise = (async () => {
      this.attachBrowserListeners();

      // 1) Basculer très vite sur un état utilisable pour ne jamais bloquer l'app.
      this.setStatus(this.getBrowserSnapshot());

      // 2) Tenter d'améliorer l'état avec Capacitor, mais sans bloquer.
      try {
        const status = await this.withTimeout(
          Network.getStatus(),
          NETWORK_INIT_TIMEOUT_MS,
          () => ({
            connected: typeof navigator !== "undefined" ? navigator.onLine : true,
            connectionType:
              typeof navigator !== "undefined" && !navigator.onLine ? "none" : "unknown",
          })
        );

        if (!this.destroyed) {
          this.setStatus({
            connected: status.connected,
            connectionType: status.connectionType,
            initialized: true,
          });
        }
      } catch (error) {
        console.warn("[networkService] Capacitor Network.getStatus unavailable, browser fallback used.", error);

        if (!this.destroyed) {
          this.setStatus(this.getBrowserSnapshot());
        }
      }

      // 3) Attacher le listener natif en arrière-plan, sans casser init.
      void this.attachNativeListeners();
    })();

    return this.initPromise;
  }

  async refresh() {
    // Toujours avoir un fallback immédiat.
    this.setStatus(this.getBrowserSnapshot());

    try {
      const status = await this.withTimeout(
        Network.getStatus(),
        NETWORK_REFRESH_TIMEOUT_MS,
        () => ({
          connected: typeof navigator !== "undefined" ? navigator.onLine : true,
          connectionType:
            typeof navigator !== "undefined" && !navigator.onLine ? "none" : "unknown",
        })
      );

      if (this.destroyed) return;

      this.setStatus({
        connected: status.connected,
        connectionType: status.connectionType,
        initialized: true,
      });
    } catch (error) {
      console.warn("[networkService] refresh fallback used.", error);

      if (this.destroyed) return;
      this.setStatus(this.getBrowserSnapshot());
    }
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
    this.destroyed = true;

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
    this.browserListenersAttached = false;
    this.nativeListenersAttached = false;
    this.initPromise = null;

    this.setStatus({
      connected: typeof navigator !== "undefined" ? navigator.onLine : true,
      connectionType:
        typeof navigator !== "undefined"
          ? navigator.onLine
            ? "unknown"
            : "none"
          : "unknown",
      initialized: false,
    });
  }
}

export const networkService = new NetworkService();

export function useNetworkStatus() {
  useEffect(() => {
    void networkService.init();
  }, []);

  return useSyncExternalStore(
    (listener) => networkService.subscribe(listener),
    () => networkService.getStatus(),
    () => networkService.getStatus()
  );
}
