import { supabase } from "@/lib/supabase";
import { localStore } from "@/services/localStore";
import { networkService } from "@/services/networkService";
import { offlineQueue } from "@/services/offlineQueue";
import { cacheKeys } from "@/services/cacheKeys";

export type FavoriteItem = {
  id: string;
  worker_id: string;
  worker_name?: string | null;
  profession?: string | null;
  created_at: string;
  pending?: boolean;
};

function localId() {
  return `local_fav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const favoritesRepository = {
  async loadFavorites(userId: string) {
    const key = cacheKeys.favorites(userId);
    const cached = (await localStore.get<FavoriteItem[]>(key)) ?? [];
    const { connected } = networkService.getStatus();

    if (!connected) {
      return { items: cached, fromCache: true };
    }

    const { data, error } = await supabase
      .from("op_ouvrier_favorites")
      .select("id, worker_id, worker_name, profession, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return { items: cached, fromCache: true };
    }

    const items = (data ?? []) as FavoriteItem[];
    await localStore.set(key, items);
    return { items, fromCache: false };
  },

  async addFavorite(params: {
    userId: string;
    workerId: string;
    workerName?: string | null;
    profession?: string | null;
  }) {
    const key = cacheKeys.favorites(params.userId);
    const { connected } = networkService.getStatus();
    const current = (await localStore.get<FavoriteItem[]>(key)) ?? [];

    const optimistic: FavoriteItem = {
      id: localId(),
      worker_id: params.workerId,
      worker_name: params.workerName ?? null,
      profession: params.profession ?? null,
      created_at: new Date().toISOString(),
      pending: !connected,
    };

    await localStore.set(key, [optimistic, ...current]);

    if (!connected) {
      await offlineQueue.enqueue({
        actionType: "ADD_FAVORITE",
        entityType: "favorite",
        entityId: params.workerId,
        userId: params.userId,
        payload: params,
      });

      return { id: optimistic.id, offline: true };
    }

    const { data, error } = await supabase
      .from("op_ouvrier_favorites")
      .insert({
        user_id: params.userId,
        worker_id: params.workerId,
        worker_name: params.workerName ?? null,
        profession: params.profession ?? null,
      })
      .select("id, worker_id, worker_name, profession, created_at")
      .single();

    if (error) throw error;

    const next = [data as FavoriteItem, ...current];
    await localStore.set(key, next);
    return { id: data.id, offline: false };
  },
};
