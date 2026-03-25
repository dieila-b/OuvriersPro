import { useEffect, useState } from "react";
import { offlineQueue } from "@/services/offlineQueue";

export function useSyncStatus() {
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      const items = await offlineQueue.list();
      if (!mounted) return;

      setPending(items.filter((i) => i.status === "pending" || i.status === "processing").length);
      setFailed(items.filter((i) => i.status === "failed").length);
    };

    void refresh();
    const t = window.setInterval(() => void refresh(), 2000);

    return () => {
      mounted = false;
      window.clearInterval(t);
    };
  }, []);

  return {
    pending,
    failed,
    synced: pending === 0 && failed === 0,
  };
}
