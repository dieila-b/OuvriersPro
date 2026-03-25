// src/services/syncService.ts
import { supabase } from "@/lib/supabase";
import { localStore } from "@/services/localStore";

export type OfflineQueueItem = {
  id: string;
  action_type:
    | "CREATE_CONTACT_REQUEST"
    | "ADD_FAVORITE"
    | "REMOVE_FAVORITE"
    | "SEND_CLIENT_MESSAGE"
    | "CREATE_WORKER_REVIEW";
  table_name:
    | "op_ouvrier_contacts"
    | "op_ouvrier_favorites"
    | "op_client_worker_messages"
    | "op_ouvrier_reviews";
  payload_json: Record<string, any>;
  created_at: string;
  status?: "pending" | "processing" | "failed";
  retry_count?: number;
  last_error?: string | null;
};

type CachedClientRequest = {
  id: string;
  created_at: string | null;
  worker_name: string | null;
  status: string | null;
  message: string | null;
  origin: string | null;
};

type CachedFavorite = {
  id: string;
  worker_id: string;
  worker_name: string | null;
  profession: string | null;
  created_at: string;
};

type CachedMessage = {
  id: string;
  contact_id: string | null;
  worker_id: string | null;
  client_id: string | null;
  sender_role: "worker" | "client";
  message: string | null;
  created_at: string;
  media_type?: string | null;
  media_path?: string | null;
  sync_status?: "pending" | "synced";
};

type CachedWorkerReview = {
  id: string;
  worker_id: string;
  rating: number | null;
  comment: string | null;
  created_at: string;
  client_name: string | null;
  sync_status?: "pending" | "synced";
};

const OFFLINE_QUEUE_KEY = "offline_queue_v1";
const REQUESTS_CACHE_PREFIX = "cached_client_requests";
const FAVORITES_CACHE_PREFIX = "cached_client_favorites";
const MESSAGES_CACHE_PREFIX = "cached_client_messages";
const WORKER_REVIEWS_CACHE_PREFIX = "cached_worker_reviews";

const getRequestsCacheKey = (userId?: string | null) =>
  userId ? `${REQUESTS_CACHE_PREFIX}:${userId}` : REQUESTS_CACHE_PREFIX;

const getFavoritesCacheKey = (userId?: string | null) =>
  userId ? `${FAVORITES_CACHE_PREFIX}:${userId}` : FAVORITES_CACHE_PREFIX;

const getMessagesCacheKey = (contactId?: string | null) =>
  contactId ? `${MESSAGES_CACHE_PREFIX}:${contactId}` : MESSAGES_CACHE_PREFIX;

const getWorkerReviewsCacheKey = (workerId?: string | null) =>
  workerId ? `${WORKER_REVIEWS_CACHE_PREFIX}:${workerId}` : WORKER_REVIEWS_CACHE_PREFIX;

const extractUserIdFromPayload = (payload: Record<string, any>): string | null => {
  const rawUserId = payload?.user_id;
  if (typeof rawUserId === "string" && rawUserId.trim()) return rawUserId.trim();

  const rawClientId = String(payload?.client_id ?? "");
  if (rawClientId.startsWith("local_client_")) {
    return rawClientId.replace("local_client_", "") || null;
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

const updateQueueItem = async (
  queueId: string,
  patch: Partial<OfflineQueueItem>
) => {
  const queue = await readQueue();
  const next = queue.map((item) =>
    item.id === queueId ? { ...item, ...patch } : item
  );
  await writeQueue(next);
};

const bumpRetryCount = async (queueId: string, error?: unknown) => {
  const queue = await readQueue();
  const next = queue.map((item) =>
    item.id === queueId
      ? {
          ...item,
          retry_count: Number(item.retry_count || 0) + 1,
          status: "failed" as const,
          last_error:
            error instanceof Error
              ? error.message
              : typeof error === "string"
              ? error
              : "Sync failed",
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
    item.id === offlineRequestId ? { ...syncedRequest } : item
  );

  const alreadyExists = replaced.some((item) => item.id === syncedRequest.id);
  const finalList = alreadyExists ? replaced : [syncedRequest, ...replaced];

  await localStore.set(cacheKey, finalList);
};

const replaceCachedFavoriteAfterSync = async (
  userId: string,
  offlineFavoriteId: string,
  syncedFavorite: CachedFavorite
) => {
  const cacheKey = getFavoritesCacheKey(userId);
  const existing = (await localStore.get<CachedFavorite[]>(cacheKey)) || [];

  const replaced = existing.map((item) =>
    item.id === offlineFavoriteId ? { ...syncedFavorite } : item
  );

  const alreadyExists = replaced.some((item) => item.id === syncedFavorite.id);
  const finalList = alreadyExists ? replaced : [syncedFavorite, ...replaced];

  await localStore.set(cacheKey, finalList);
};

const removeCachedFavoriteAfterSync = async (userId: string, workerId: string) => {
  const cacheKey = getFavoritesCacheKey(userId);
  const existing = (await localStore.get<CachedFavorite[]>(cacheKey)) || [];
  await localStore.set(
    cacheKey,
    existing.filter((item) => item.worker_id !== workerId)
  );
};

const replaceCachedMessageAfterSync = async (
  contactId: string,
  offlineMessageId: string,
  syncedMessage: CachedMessage
) => {
  const cacheKey = getMessagesCacheKey(contactId);
  const existing = (await localStore.get<CachedMessage[]>(cacheKey)) || [];

  const replaced = existing.map((item) =>
    item.id === offlineMessageId
      ? { ...syncedMessage, sync_status: "synced" }
      : item
  );

  const alreadyExists = replaced.some((item) => item.id === syncedMessage.id);
  const merged = alreadyExists
    ? replaced
    : [...replaced, { ...syncedMessage, sync_status: "synced" }];

  merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  await localStore.set(cacheKey, merged);
};

const replaceCachedReviewAfterSync = async (
  workerId: string,
  offlineReviewId: string,
  syncedReview: CachedWorkerReview
) => {
  const cacheKey = getWorkerReviewsCacheKey(workerId);
  const existing = (await localStore.get<CachedWorkerReview[]>(cacheKey)) || [];

  const replaced = existing.map((item) =>
    item.id === offlineReviewId
      ? { ...syncedReview, sync_status: "synced" }
      : item
  );

  const alreadyExists = replaced.some((item) => item.id === syncedReview.id);
  const merged = alreadyExists
    ? replaced
    : [{ ...syncedReview, sync_status: "synced" }, ...replaced];

  merged.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  await localStore.set(cacheKey, merged);
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

  if (insertError) throw insertError;

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

const syncAddFavorite = async (item: OfflineQueueItem) => {
  const payload = item.payload_json || {};
  const userId = extractUserIdFromPayload(payload);

  if (!userId) {
    throw new Error("Offline favorite is missing a resolvable user id.");
  }

  const insertPayload = {
    worker_id: payload.worker_id,
    worker_name: payload.worker_name ?? null,
    profession: payload.profession ?? null,
  };

  const { data, error } = await supabase
    .from("op_ouvrier_favorites")
    .insert(insertPayload)
    .select("id, worker_id, worker_name, profession, created_at")
    .maybeSingle();

  if (error) throw error;

  const syncedFavorite: CachedFavorite = {
    id: data?.id || payload.local_favorite_id || item.id,
    worker_id: data?.worker_id || payload.worker_id,
    worker_name: data?.worker_name || payload.worker_name || null,
    profession: data?.profession || payload.profession || null,
    created_at: data?.created_at || payload.created_at || new Date().toISOString(),
  };

  await replaceCachedFavoriteAfterSync(
    userId,
    String(payload.local_favorite_id || payload.id || ""),
    syncedFavorite
  );

  await removeQueueItem(item.id);
};

const syncRemoveFavorite = async (item: OfflineQueueItem) => {
  const payload = item.payload_json || {};
  const userId = extractUserIdFromPayload(payload);

  if (!userId) {
    throw new Error("Offline favorite removal is missing a resolvable user id.");
  }

  let query = supabase.from("op_ouvrier_favorites").delete();

  if (payload.favorite_id && !String(payload.favorite_id).startsWith("local_")) {
    query = query.eq("id", payload.favorite_id);
  } else if (payload.worker_id) {
    query = query.eq("worker_id", payload.worker_id);
  }

  const { error } = await query;
  if (error) throw error;

  await removeCachedFavoriteAfterSync(userId, String(payload.worker_id || ""));
  await removeQueueItem(item.id);
};

const syncSendClientMessage = async (item: OfflineQueueItem) => {
  const payload = item.payload_json || {};
  const contactId = String(payload.contact_id || "").trim();

  if (!contactId) {
    throw new Error("Offline message is missing contact_id.");
  }

  const insertPayload = {
    contact_id: payload.contact_id ?? null,
    worker_id: payload.worker_id ?? null,
    client_id: payload.client_id ?? null,
    sender_role: "client" as const,
    message: payload.message ?? "",
    media_type: payload.media_type ?? null,
    media_path: payload.media_path ?? null,
  };

  const { data, error } = await supabase
    .from("op_client_worker_messages")
    .insert(insertPayload)
    .select("id, contact_id, worker_id, client_id, sender_role, message, media_type, media_path, created_at")
    .single();

  if (error) throw error;

  const syncedMessage: CachedMessage = {
    id: data.id,
    contact_id: data.contact_id,
    worker_id: data.worker_id,
    client_id: data.client_id,
    sender_role: data.sender_role,
    message: data.message,
    media_type: data.media_type ?? null,
    media_path: data.media_path ?? null,
    created_at: data.created_at,
    sync_status: "synced",
  };

  await replaceCachedMessageAfterSync(
    contactId,
    String(payload.local_message_id || payload.id || ""),
    syncedMessage
  );

  await removeQueueItem(item.id);
};

const syncCreateWorkerReview = async (item: OfflineQueueItem) => {
  const payload = item.payload_json || {};
  const userId = extractUserIdFromPayload(payload);
  const workerId = String(payload.worker_id || "").trim();

  if (!userId) {
    throw new Error("Offline review is missing a resolvable user id.");
  }

  if (!workerId) {
    throw new Error("Offline review is missing worker_id.");
  }

  const insertBase = {
    client_id: userId,
    worker_id: workerId,
    rating: payload.rating ?? null,
    comment: payload.comment ?? null,
  };

  let inserted: any = null;
  let insertError: any = null;

  const attempt1 = await supabase
    .from("op_ouvrier_reviews")
    .insert({ ...insertBase, status: "pending" })
    .select("id, rating, comment, created_at, client_name")
    .maybeSingle();

  insertError = attempt1.error;
  inserted = attempt1.data;

  if (insertError && /column .*status/i.test(insertError.message || "")) {
    const attempt2 = await supabase
      .from("op_ouvrier_reviews")
      .insert(insertBase)
      .select("id, rating, comment, created_at, client_name")
      .maybeSingle();

    insertError = attempt2.error;
    inserted = attempt2.data;
  }

  if (insertError) throw insertError;

  const syncedReview: CachedWorkerReview = {
    id: inserted?.id || payload.local_review_id || item.id,
    worker_id: workerId,
    rating: inserted?.rating ?? payload.rating ?? null,
    comment: inserted?.comment ?? payload.comment ?? null,
    created_at: inserted?.created_at || payload.created_at || new Date().toISOString(),
    client_name: inserted?.client_name ?? payload.client_name ?? null,
    sync_status: "synced",
  };

  await replaceCachedReviewAfterSync(
    workerId,
    String(payload.local_review_id || payload.id || ""),
    syncedReview
  );

  await removeQueueItem(item.id);
};

class SyncService {
  private running = false;

  async getQueue(): Promise<OfflineQueueItem[]> {
    return await readQueue();
  }

  async enqueue(
    item: Omit<OfflineQueueItem, "status" | "retry_count" | "last_error">
  ): Promise<void> {
    const queue = await readQueue();
    await writeQueue([
      {
        ...item,
        status: "pending",
        retry_count: 0,
        last_error: null,
      },
      ...queue,
    ]);
  }

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

      const ordered = [...queue].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      for (const item of ordered) {
        try {
          await updateQueueItem(item.id, { status: "processing", last_error: null });

          if (
            item.action_type === "CREATE_CONTACT_REQUEST" &&
            item.table_name === "op_ouvrier_contacts"
          ) {
            await syncCreateContactRequest(item);
            continue;
          }

          if (
            item.action_type === "ADD_FAVORITE" &&
            item.table_name === "op_ouvrier_favorites"
          ) {
            await syncAddFavorite(item);
            continue;
          }

          if (
            item.action_type === "REMOVE_FAVORITE" &&
            item.table_name === "op_ouvrier_favorites"
          ) {
            await syncRemoveFavorite(item);
            continue;
          }

          if (
            item.action_type === "SEND_CLIENT_MESSAGE" &&
            item.table_name === "op_client_worker_messages"
          ) {
            await syncSendClientMessage(item);
            continue;
          }

          if (
            item.action_type === "CREATE_WORKER_REVIEW" &&
            item.table_name === "op_ouvrier_reviews"
          ) {
            await syncCreateWorkerReview(item);
            continue;
          }

          await removeQueueItem(item.id);
        } catch (error) {
          console.error("[syncService] item sync failed:", item.id, error);
          await bumpRetryCount(item.id, error);
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
