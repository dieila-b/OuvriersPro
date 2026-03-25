import { useEffect, useRef } from "react";
import { useNetworkStatus } from "@/services/networkService";
import { syncEngine } from "@/services/syncEngine";

export default function SyncBootstrap() {
  const { connected, initialized } = useNetworkStatus();
  const bootedRef = useRef(false);

  useEffect(() => {
    if (!initialized) return;

    if (!bootedRef.current) {
      bootedRef.current = true;
      void syncEngine.syncNow();
    }
  }, [initialized]);

  useEffect(() => {
    if (!initialized || !connected) return;
    void syncEngine.syncNow();
  }, [connected, initialized]);

  useEffect(() => {
    const onFocus = () => void syncEngine.syncNow();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void syncEngine.syncNow();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
