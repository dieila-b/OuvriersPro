// src/hooks/useSyncStatusSummary.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { localStore } from "@/services/localStore";
import { authCache } from "@/services/authCache";
import { useNetworkStatus } from "@/services/networkService";

type OfflineQueueItem = {
  id: string;
  action_type:
    | "CREATE_CONTACT_REQUEST"
    | "ADD_FAVORITE"
    | "REMOVE_FAVORITE"
    | "SEND_CLIENT_MESSAGE";
  table_name: "op_ouvrier_contacts" | "op_ouvrier_favorites" | "op_client_worker_messages";
  payload_json: Record<string, any>;
  created_at: string;
  status: "pending";
  retry_count: number;
};

const OFFLINE_QUEUE_KEY = "offline_queue_v1";

export type SyncStatusSummary = {
  initialized: boolean;
  connected: boolean;

  userId: string | null;

  pendingRequestsCount: number;
  pendingMessagesCount: number;
  pendingFavoritesCount: number;
  totalPending: number;

  hasPendingSync: boolean;
  isFullySynced: boolean;

  refresh: () => Promise<void>;
};

type Options = {
  userId?: string | null;
  pollMs?: number;
  enabled?: boolean;
};

export function useSyncStatusSummary(options?: Options): SyncStatusSummary {
  const { connected, initialized } = useNetworkStatus();

  const externalUserId = options?.userId ?? null;
  const pollMs = options?.pollMs ?? 3500;
  const enabled = options?.enabled ?? true;

  const [resolvedUserId, setResolvedUserId] = useState<string | null>(externalUserId);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingMessagesCount, setPendingMessagesCount] = useState(0);
  const [pendingFavoritesCount, setPendingFavoritesCount] = useState(0);

  const pollRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setPendingRequestsCount(0);
      setPendingMessagesCount(0);
      setPendingFavoritesCount(0);
      return;
    }

    try {
      const userId = externalUserId ?? (await authCache.getUserId()) ?? null;
      setResolvedUserId(userId);

      if (!userId) {
        setPendingRequestsCount(0);
        setPendingMessagesCount(0);
        setPendingFavoritesCount(0);
        return;
      }

      const queue = (await localStore.get<OfflineQueueItem[]>(OFFLINE_QUEUE_KEY)) || [];

      const scopedQueue = queue.filter((item) => {
        if (item.status !== "pending") return false;

        const payloadUserId = item.payload_json?.user_id;
        if (!payloadUserId) return true;

        return String(payloadUserId) === String(userId);
      });

      const nextPendingRequests = scopedQueue.filter(
        (item) => item.action_type === "CREATE_CONTACT_REQUEST"
      ).length;

      const nextPendingMessages = scopedQueue.filter(
        (item) => item.action_type === "SEND_CLIENT_MESSAGE"
      ).length;

      const nextPendingFavorites = scopedQueue.filter(
        (item) =>
          item.action_type === "ADD_FAVORITE" || item.action_type === "REMOVE_FAVORITE"
      ).length;

      setPendingRequestsCount(nextPendingRequests);
      setPendingMessagesCount(nextPendingMessages);
      setPendingFavoritesCount(nextPendingFavorites);
    } catch (error) {
      console.error("[useSyncStatusSummary] refresh error:", error);
      setPendingRequestsCount(0);
      setPendingMessagesCount(0);
      setPendingFavoritesCount(0);
    }
  }, [enabled, externalUserId]);

  useEffect(() => {
    if (!initialized) return;
    void refresh();
  }, [initialized, refresh]);

  useEffect(() => {
    if (!initialized || !enabled) return;

    const onRefresh = () => {
      void refresh();
    };

    window.addEventListener("focus", onRefresh);
    window.addEventListener("storage", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);

    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("storage", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
    };
  }, [initialized, enabled, refresh]);

  useEffect(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (!initialized || !enabled) return;

    pollRef.current = window.setInterval(() => {
      void refresh();
    }, pollMs);

    return () => {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [initialized, enabled, pollMs, refresh]);

  const totalPending = useMemo(() => {
    return pendingRequestsCount + pendingMessagesCount + pendingFavoritesCount;
  }, [pendingRequestsCount, pendingMessagesCount, pendingFavoritesCount]);

  const hasPendingSync = totalPending > 0;
  const isFullySynced = totalPending === 0;

  return {
    initialized,
    connected,
    userId: resolvedUserId,

    pendingRequestsCount,
    pendingMessagesCount,
    pendingFavoritesCount,
    totalPending,

    hasPendingSync,
    isFullySynced,

    refresh,
  };
}

export default useSyncStatusSummary;
