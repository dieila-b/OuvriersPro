// src/services/favoritesRepository.ts
import { supabase } from "@/lib/supabase";
import { localStore } from "@/services/localStore";

type Favorite = {
  id: string;
  worker_id: string;
  worker_name: string | null;
  profession: string | null;
  created_at: string;
};

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

const FAVORITES_CACHE_PREFIX = "cached_client_favorites";
const OFFLINE_QUEUE_KEY = "offline_queue_v1";

const getFavoritesCacheKey = (userId?: string | null) =>
  userId ? `${FAVORITES_CACHE_PREFIX}:${userId}` : FAVORITES_CACHE_PREFIX;

const createOfflineId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const readQueue = async (): Promise<OfflineQueueItem[]> => {
  return (await localStore.get<OfflineQueueItem[]>(OFFLINE_QUEUE_KEY)) || [];
};

const writeQueue = async (items: OfflineQueueItem[]) => {
  await localStore.set(OFFLINE_QUEUE_KEY, items);
};

const addQueueItem = async (item: OfflineQueueItem) => {
  const queue = await readQueue();
  await writeQueue([item, ...queue]);
};

const removePendingFavoriteActions = async (userId: string, workerId: string) => {
  const queue = await readQueue();
  const next = queue.filter((item) => {
    if (item.table_name !== "op_ouvrier_favorites") return true;
    const payload = item.payload_json || {};
    const sameUser = String(payload.user_id || "") === userId;
    const sameWorker = String(payload.worker_id || "") === workerId;
    return !(sameUser && sameWorker);
  });
  await writeQueue(next);
};

const loadCachedFavorites = async (userId: string): Promise<Favorite[]> => {
  return (await localStore.get<Favorite[]>(getFavoritesCacheKey(userId))) || [];
};

const saveCachedFavorites = async (userId: string, items: Favorite[]) => {
  await localStore.set(getFavoritesCacheKey(userId), items);
};

export const favoritesRepository = {
  async loadFavorites(userId: string, connected: boolean): Promise<{ items: Favorite[]; fromCache: boolean }> {
    const cacheKey = getFavoritesCacheKey(userId);

    if (!connected) {
      const cached = (await localStore.get<Favorite[]>(cacheKey)) || [];
      return { items: cached, fromCache: true };
    }

    try {
      const { data, error } = await supabase
        .from("op_ouvrier_favorites")
        .select("id, worker_id, worker_name, profession, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items = (data || []) as Favorite[];
      await localStore.set(cacheKey, items);
      return { items, fromCache: false };
    } catch (error) {
      console.error("[favoritesRepository] loadFavorites fallback cache:", error);
      const cached = (await localStore.get<Favorite[]>(cacheKey)) || [];
      return { items: cached, fromCache: true };
    }
  },

  async addFavorite(params: {
    userId: string;
    connected: boolean;
    workerId: string;
    workerName: string | null;
    profession: string | null;
  }): Promise<Favorite> {
    const { userId, connected, workerId, workerName, profession } = params;
    const cacheKey = getFavoritesCacheKey(userId);
    const existing = (await localStore.get<Favorite[]>(cacheKey)) || [];

    const already = existing.find((item) => item.worker_id === workerId);
    if (already) return already;

    const localFavorite: Favorite = {
      id: createOfflineId("local_favorite"),
      worker_id: workerId,
      worker_name: workerName ?? null,
      profession: profession ?? null,
      created_at: new Date().toISOString(),
    };

    await localStore.set(cacheKey, [localFavorite, ...existing]);

    if (!connected) {
      await addQueueItem({
        id: createOfflineId("queue"),
        action_type: "ADD_FAVORITE",
        table_name: "op_ouvrier_favorites",
        payload_json: {
          user_id: userId,
          worker_id: workerId,
          worker_name: workerName ?? null,
          profession: profession ?? null,
          local_favorite_id: localFavorite.id,
          created_at: localFavorite.created_at,
        },
        created_at: new Date().toISOString(),
        status: "pending",
        retry_count: 0,
      });

      return localFavorite;
    }

    try {
      const { data, error } = await supabase
        .from("op_ouvrier_favorites")
        .insert({
          worker_id: workerId,
          worker_name: workerName ?? null,
          profession: profession ?? null,
        })
        .select("id, worker_id, worker_name, profession, created_at")
        .maybeSingle();

      if (error) throw error;

      const syncedFavorite: Favorite = {
        id: data?.id || localFavorite.id,
        worker_id: data?.worker_id || workerId,
        worker_name: data?.worker_name || workerName || null,
        profession: data?.profession || profession || null,
        created_at: data?.created_at || localFavorite.created_at,
      };

      const refreshed = ((await localStore.get<Favorite[]>(cacheKey)) || []).map((item) =>
        item.id === localFavorite.id ? syncedFavorite : item
      );

      await localStore.set(cacheKey, refreshed);
      return syncedFavorite;
    } catch (error) {
      console.error("[favoritesRepository] addFavorite fallback queue:", error);

      await addQueueItem({
        id: createOfflineId("queue"),
        action_type: "ADD_FAVORITE",
        table_name: "op_ouvrier_favorites",
        payload_json: {
          user_id: userId,
          worker_id: workerId,
          worker_name: workerName ?? null,
          profession: profession ?? null,
          local_favorite_id: localFavorite.id,
          created_at: localFavorite.created_at,
        },
        created_at: new Date().toISOString(),
        status: "pending",
        retry_count: 0,
      });

      return localFavorite;
    }
  },

  async removeFavorite(params: {
    userId: string;
    connected: boolean;
    workerId: string;
    favoriteId?: string | null;
  }): Promise<void> {
    const { userId, connected, workerId, favoriteId } = params;
    const current = await loadCachedFavorites(userId);

    await saveCachedFavorites(
      userId,
      current.filter((item) => item.worker_id !== workerId)
    );

    await removePendingFavoriteActions(userId, workerId);

    if (!connected) {
      await addQueueItem({
        id: createOfflineId("queue"),
        action_type: "REMOVE_FAVORITE",
        table_name: "op_ouvrier_favorites",
        payload_json: {
          user_id: userId,
          worker_id: workerId,
          favorite_id: favoriteId ?? null,
        },
        created_at: new Date().toISOString(),
        status: "pending",
        retry_count: 0,
      });
      return;
    }

    try {
      let query = supabase.from("op_ouvrier_favorites").delete();

      if (favoriteId && !String(favoriteId).startsWith("local_")) {
        query = query.eq("id", favoriteId);
      } else {
        query = query.eq("worker_id", workerId);
      }

      const { error } = await query;
      if (error) throw error;
    } catch (error) {
      console.error("[favoritesRepository] removeFavorite fallback queue:", error);

      await addQueueItem({
        id: createOfflineId("queue"),
        action_type: "REMOVE_FAVORITE",
        table_name: "op_ouvrier_favorites",
        payload_json: {
          user_id: userId,
          worker_id: workerId,
          favorite_id: favoriteId ?? null,
        },
        created_at: new Date().toISOString(),
        status: "pending",
        retry_count: 0,
      });
    }
  },
};

export type { Favorite };
