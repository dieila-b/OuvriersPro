// src/services/syncService.ts
import { supabase } from "@/lib/supabase";
import { localStore } from "@/services/localStore";

type OfflineQueueItem = {
  id: string;
  action_type: "CREATE_CONTACT_REQUEST";
  table_name: "op_ouvrier_contacts";
  payload_json: Record<string, any>;
  created_at: string;
  status: "pending";
  retry_count: number;
};

type CachedClientRequest = {
  id: string;
  created_at: string | null;
  worker_name: string | null;
  status: string | null;
  message: string | null;
  origin: string | null;
};

const OFFLINE_QUEUE_KEY = "offline_queue_v1";
const REQUESTS_CACHE_PREFIX = "cached_client_requests";

const getRequestsCacheKey = (userId?: string | null) =>
  userId ? `${REQUESTS_CACHE_PREFIX}:${userId}` : REQUESTS_CACHE_PREFIX;

const extractUserIdFromPayload = (payload: Record<string, any>): string | null => {
  const rawClientId = String(payload?.client_id ?? "");
  if (rawClientId.startsWith("local_client_")) {
    return rawClientId.replace("local_client_", "") || null;
  }

  const rawUserId = payload?.user_id;
  if (typeof rawUserId === "string" && rawUserId.trim()) {
    return rawUserId.trim();
  }

  return null;
};

const readQueue = async (): Promise<OfflineQueueItem[]> => {
  return (await localStore.get<OfflineQueueItem[]>(OFFLINE_QUEUE_KEY)) || [];
};

const writeQueue = async (items: OfflineQueueItem[]) => {
  await localStore.set(OFFLINE_QUEUE_KEY, items);
};

const removeQueueItem = async (queueId: string) => {
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.id !== queueId));
};

const bumpRetryCount = async (queueId: string) => {
  const queue = await readQueue();
  const next = queue.map((item) =>
    item.id === queueId
      ? {
          ...item,
          retry_count: Number(item.retry_count || 0) + 1,
        }
      : item
  );
  await writeQueue(next);
};

const replaceCachedRequestAfterSync = async (
  userId: string,
  offlineRequestId: string,
  syncedRequest: CachedClientRequest
) => {
  const cacheKey = getRequestsCacheKey(userId);
  const existing = (await localStore.get<CachedClientRequest[]>(cacheKey)) || [];

  const replaced = existing.map((item) =>
    item.id === offlineRequestId
      ? {
          ...syncedRequest,
        }
      : item
  );

  const exists = replaced.some((item) => item.id === syncedRequest.id);
  const finalList = exists ? replaced : [syncedRequest, ...replaced];

  await localStore.set(cacheKey, finalList);
};

const ensureClientProfileId = async (userId: string, payload: Record<string, any>) => {
  const { data: existingClient, error: selectClientError } = await supabase
    .from("op_clients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectClientError && selectClientError.code !== "PGRST116") {
    throw selectClientError;
  }

  if (existingClient?.id) {
    return existingClient.id as string;
  }

  const fallbackName = String(payload?.client_name ?? payload?.full_name ?? "").trim();
  const [firstName] = fallbackName ? fallbackName.split(" ") : [""];

  const { data: newClient, error: insertClientError } = await supabase
    .from("op_clients")
    .insert({
      user_id: userId,
      first_name: firstName || null,
      last_name: null,
      email: payload?.client_email ?? payload?.email ?? null,
      phone: payload?.client_phone ?? payload?.phone ?? null,
    })
    .select("id")
    .maybeSingle();

  if (insertClientError || !newClient?.id) {
    throw insertClientError || new Error("Unable to create client profile during sync.");
  }

  return newClient.id as string;
};

const syncCreateContactRequest = async (item: OfflineQueueItem) => {
  const payload = item.payload_json || {};
  const userId = extractUserIdFromPayload(payload);

  if (!userId) {
    throw new Error("Offline contact request is missing a resolvable user id.");
  }

  const clientProfileId = await ensureClientProfileId(userId, payload);

  const insertPayload = {
    worker_id: payload.worker_id ?? null,
    client_id: clientProfileId,
    full_name: payload.full_name ?? payload.client_name ?? null,
    email: payload.email ?? payload.client_email ?? null,
    phone: payload.phone ?? payload.client_phone ?? null,
    message: payload.message ?? "",
    status: "new",
    origin: "web",
    client_name: payload.client_name ?? payload.full_name ?? null,
    client_email: payload.client_email ?? payload.email ?? null,
    client_phone: payload.client_phone ?? payload.phone ?? null,
    worker_name: payload.worker_name ?? null,
  };

  const { data: insertedContact, error: insertError } = await supabase
    .from("op_ouvrier_contacts")
    .insert(insertPayload)
    .select("id, created_at, worker_name, status, message, origin")
    .maybeSingle();

  if (insertError) {
    throw insertError;
  }

  const syncedRequest: CachedClientRequest = {
    id: insertedContact?.id || payload.id || item.id,
    created_at: insertedContact?.created_at || new Date().toISOString(),
    worker_name: insertedContact?.worker_name || payload.worker_name || null,
    status: insertedContact?.status || "new",
    message: insertedContact?.message || payload.message || "",
    origin: insertedContact?.origin || "web",
  };

  await replaceCachedRequestAfterSync(userId, String(payload.id || ""), syncedRequest);
  await removeQueueItem(item.id);
};

class SyncService {
  private running = false;

  async syncNow(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user ?? null;

      if (!sessionUser) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;

      const queue = await readQueue();
      if (!queue.length) return;

      for (const item of queue) {
        try {
          if (
            item.action_type === "CREATE_CONTACT_REQUEST" &&
            item.table_name === "op_ouvrier_contacts"
          ) {
            await syncCreateContactRequest(item);
          }
        } catch (error) {
          console.error("[syncService] item sync failed:", item.id, error);
          await bumpRetryCount(item.id);
        }
      }
    } catch (error) {
      console.error("[syncService] syncNow failed:", error);
    } finally {
      this.running = false;
    }
  }
}

export const syncService = new SyncService();
export type { OfflineQueueItem, CachedClientRequest };
