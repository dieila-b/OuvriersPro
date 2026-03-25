// src/services/favoritesRepository.ts
import { supabase } from "@/lib/supabase";
import { localStore } from "@/services/localStore";
import { syncService } from "@/services/syncService";

type Favorite = {
  id: string;
  worker_id: string;
  worker_name: string | null;
  profession: string | null;
  created_at: string;
  pending?: boolean;
};

type QueueActionType =
  | "CREATE_CONTACT_REQUEST"
  | "ADD_FAVORITE"
  | "REMOVE_FAVORITE"
  | "SEND_CLIENT_MESSAGE";

type QueueTableName =
  | "op_ouvrier_contacts"
  | "op_ouvrier_favorites"
  | "op_client_worker_messages";

const FAVORITES_CACHE_PREFIX = "cached_client_favorites";

const getFavoritesCacheKey = (userId?: string | null) =>
  userId ? `${FAVORITES_CACHE_PREFIX}:${userId}` : FAVORITES_CACHE_PREFIX;

const createOfflineId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const nowIso = () => new Date().toISOString();

const loadCachedFavorites = async (userId: string): Promise<Favorite[]> => {
  return (await localStore.get<Favorite[]>(getFavoritesCacheKey(userId))) || [];
};

const saveCachedFavorites = async (userId: string, items: Favorite[]) => {
  await localStore.set(getFavoritesCacheKey(userId), items);
};

const dedupeFavorites = (items: Favorite[]): Favorite[] => {
  const seen = new Set<string>();
  const out: Favorite[] = [];

  for (const item of items) {
    const key = String(item.worker_id || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
};

const replaceFavoriteInCache = async (
  userId: string,
  matcher: (item: Favorite) => boolean,
  replacement: Favorite
) => {
  const current = await loadCachedFavorites(userId);

  const replaced = current.map((item) =>
    matcher(item) ? { ...replacement, pending: false } : item
  );

  const alreadyExists = replaced.some((item) => item.id === replacement.id);
  const next = alreadyExists ? replaced : [{ ...replacement, pending: false }, ...replaced];

  await saveCachedFavorites(userId, dedupeFavorites(next));
};

const removeFavoriteFromCache = async (userId: string, workerId: string) => {
  const current = await loadCachedFavorites(userId);
  await saveCachedFavorites(
    userId,
    current.filter((item) => item.worker_id !== workerId)
  );
};

const readQueue = async () => {
  return await syncService.getQueue();
};

const removePendingFavoriteActions = async (userId: string, workerId: string) => {
  const queue = await readQueue();

  const next = queue.filter((item) => {
    if (item.table_name !== "op_ouvrier_favorites") return true;

    const payload = item.payload_json || {};
    const sameUser = String(payload.user_id || "") === String(userId);
    const sameWorker = String(payload.worker_id || "") === String(workerId);

    return !(sameUser && sameWorker);
  });

  await localStore.set("offline_queue_v1", next);
};

const enqueueFavoriteAction = async (params: {
  actionType: Extract<QueueActionType, "ADD_FAVORITE" | "REMOVE_FAVORITE">;
  userId: string;
  workerId: string;
  workerName?: string | null;
  profession?: string | null;
  favoriteId?: string | null;
  localFavoriteId?: string | null;
  createdAt?: string;
}) => {
  await syncService.enqueue({
    id: createOfflineId("queue"),
    action_type: params.actionType,
    table_name: "op_ouvrier_favorites" as QueueTableName,
    payload_json: {
      user_id: params.userId,
      worker_id: params.workerId,
      worker_name: params.workerName ?? null,
      profession: params.profession ?? null,
      favorite_id: params.favoriteId ?? null,
      local_favorite_id: params.localFavoriteId ?? null,
      created_at: params.createdAt ?? nowIso(),
    },
    created_at: nowIso(),
  });
};

export const favoritesRepository = {
  async loadFavorites(
    userId: string,
    connected: boolean
  ): Promise<{ items: Favorite[]; fromCache: boolean }> {
    const cacheKey = getFavoritesCacheKey(userId);

    if (!connected) {
      const cached = (await localStore.get<Favorite[]>(cacheKey)) || [];
      return { items: dedupeFavorites(cached), fromCache: true };
    }

    try {
      const { data, error } = await supabase
        .from("op_ouvrier_favorites")
        .select("id, worker_id, worker_name, profession, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items = dedupeFavorites((data || []) as Favorite[]);
      await localStore.set(cacheKey, items);
      return { items, fromCache: false };
    } catch (error) {
      console.error("[favoritesRepository] loadFavorites fallback cache:", error);
      const cached = (await localStore.get<Favorite[]>(cacheKey)) || [];
      return { items: dedupeFavorites(cached), fromCache: true };
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

    const existing = await loadCachedFavorites(userId);
    const already = existing.find((item) => item.worker_id === workerId);

    if (already) {
      return already;
    }

    const localFavorite: Favorite = {
      id: createOfflineId("local_favorite"),
      worker_id: workerId,
      worker_name: workerName ?? null,
      profession: profession ?? null,
      created_at: nowIso(),
      pending: !connected,
    };

    await saveCachedFavorites(userId, dedupeFavorites([localFavorite, ...existing]));
    await removePendingFavoriteActions(userId, workerId);

    if (!connected) {
      await enqueueFavoriteAction({
        actionType: "ADD_FAVORITE",
        userId,
        workerId,
        workerName,
        profession,
        localFavoriteId: localFavorite.id,
        createdAt: localFavorite.created_at,
      });

      return localFavorite;
    }

    try {
      const { data, error } = await supabase
        .from("op_ouvrier_favorites")
        .insert({
          user_id: userId,
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
        pending: false,
      };

      await replaceFavoriteInCache(
        userId,
        (item) => item.id === localFavorite.id || item.worker_id === workerId,
        syncedFavorite
      );

      return syncedFavorite;
    } catch (error) {
      console.error("[favoritesRepository] addFavorite fallback queue:", error);

      await enqueueFavoriteAction({
        actionType: "ADD_FAVORITE",
        userId,
        workerId,
        workerName,
        profession,
        localFavoriteId: localFavorite.id,
        createdAt: localFavorite.created_at,
      });

      return { ...localFavorite, pending: true };
    }
  },

  async removeFavorite(params: {
    userId: string;
    connected: boolean;
    workerId: string;
    favoriteId?: string | null;
  }): Promise<void> {
    const { userId, connected, workerId, favoriteId } = params;

    await removeFavoriteFromCache(userId, workerId);
    await removePendingFavoriteActions(userId, workerId);

    if (!connected) {
      await enqueueFavoriteAction({
        actionType: "REMOVE_FAVORITE",
        userId,
        workerId,
        favoriteId: favoriteId ?? null,
      });
      return;
    }

    try {
      let query = supabase.from("op_ouvrier_favorites").delete().eq("user_id", userId);

      if (favoriteId && !String(favoriteId).startsWith("local_")) {
        query = query.eq("id", favoriteId);
      } else {
        query = query.eq("worker_id", workerId);
      }

      const { error } = await query;
      if (error) throw error;
    } catch (error) {
      console.error("[favoritesRepository] removeFavorite fallback queue:", error);

      await enqueueFavoriteAction({
        actionType: "REMOVE_FAVORITE",
        userId,
        workerId,
        favoriteId: favoriteId ?? null,
      });
    }
  },
};

export type { Favorite };
