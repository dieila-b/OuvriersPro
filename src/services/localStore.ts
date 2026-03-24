// src/services/localStore.ts
import { Preferences } from "@capacitor/preferences";

export const LocalKeys = {
  USER_PROFILE: "local_user_profile",
  WORKERS: "local_workers",
  SERVICES: "local_services",
  DISTRICTS: "local_districts",
  SEARCH_HISTORY: "local_search_history",
  FAVORITES: "local_favorites",
  OFFLINE_QUEUE: "offline_queue",
  LAST_SYNC_AT: "last_sync_at",
} as const;

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn("[localStore] JSON parse failed", error);
    return null;
  }
}

export const localStore = {
  async set<T>(key: string, value: T): Promise<void> {
    await Preferences.set({
      key,
      value: JSON.stringify(value),
    });
  },

  async get<T>(key: string): Promise<T | null> {
    const { value } = await Preferences.get({ key });
    return safeParse<T>(value);
  },

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  },

  async exists(key: string): Promise<boolean> {
    const { value } = await Preferences.get({ key });
    return value !== null;
  },

  async clear(): Promise<void> {
    await Preferences.clear();
  },

  async mergeObject<T extends Record<string, any>>(key: string, patch: Partial<T>): Promise<T> {
    const current = (await this.get<T>(key)) ?? ({} as T);
    const merged = { ...current, ...patch } as T;
    await this.set(key, merged);
    return merged;
  },

  async replaceArray<T>(key: string, items: T[]): Promise<T[]> {
    await this.set(key, items);
    return items;
  },

  async pushToArray<T>(key: string, item: T): Promise<T[]> {
    const current = (await this.get<T[]>(key)) ?? [];
    const next = [...current, item];
    await this.set(key, next);
    return next;
  },
};
