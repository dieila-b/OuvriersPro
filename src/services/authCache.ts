// src/services/authCache.ts
import { localStore } from "@/services/localStore";

export type Role = "user" | "client" | "worker" | "admin";

export type CachedAuthProfile = Record<string, any> | null;

export const AUTH_CACHE_KEYS = {
  USER_ID: "local_auth_user_id",
  ROLE: "local_auth_role",
  PROFILE: "local_auth_profile",
  LAST_SYNC_AT: "local_auth_last_sync_at",
} as const;

export function normalizeRole(r: any): Role {
  const v = String(r ?? "").toLowerCase().trim();

  if (v === "admin") return "admin";
  if (v === "worker" || v === "ouvrier" || v === "provider" || v === "prestataire") return "worker";
  if (v === "client" || v === "customer") return "client";
  if (v === "user" || v === "particulier") return "user";

  return "user";
}

export const authCache = {
  async saveUser(userId: string, role: Role, profile?: CachedAuthProfile) {
    const tasks: Promise<void>[] = [
      localStore.set(AUTH_CACHE_KEYS.USER_ID, userId),
      localStore.set(AUTH_CACHE_KEYS.ROLE, normalizeRole(role)),
      localStore.set(AUTH_CACHE_KEYS.LAST_SYNC_AT, new Date().toISOString()),
    ];

    if (typeof profile !== "undefined") {
      if (profile === null) {
        tasks.push(localStore.remove(AUTH_CACHE_KEYS.PROFILE));
      } else {
        tasks.push(localStore.set(AUTH_CACHE_KEYS.PROFILE, profile));
      }
    }

    await Promise.all(tasks);
  },

  async updateProfile(profile: CachedAuthProfile) {
    if (profile === null) {
      await localStore.remove(AUTH_CACHE_KEYS.PROFILE);
      return;
    }

    await localStore.set(AUTH_CACHE_KEYS.PROFILE, profile);
  },

  async getUserId() {
    return localStore.get<string>(AUTH_CACHE_KEYS.USER_ID);
  },

  async getRole() {
    const role = await localStore.get<Role>(AUTH_CACHE_KEYS.ROLE);
    return normalizeRole(role);
  },

  async getProfile<T = any>() {
    return localStore.get<T>(AUTH_CACHE_KEYS.PROFILE);
  },

  async getLastSyncAt() {
    return localStore.get<string>(AUTH_CACHE_KEYS.LAST_SYNC_AT);
  },

  async getSnapshot<TProfile = any>() {
    const [userId, role, profile, lastSyncAt] = await Promise.all([
      localStore.get<string>(AUTH_CACHE_KEYS.USER_ID),
      localStore.get<Role>(AUTH_CACHE_KEYS.ROLE),
      localStore.get<TProfile>(AUTH_CACHE_KEYS.PROFILE),
      localStore.get<string>(AUTH_CACHE_KEYS.LAST_SYNC_AT),
    ]);

    return {
      userId,
      role: normalizeRole(role),
      profile,
      lastSyncAt,
      hasSession: !!userId,
    };
  },

  async clear() {
    await Promise.all([
      localStore.remove(AUTH_CACHE_KEYS.USER_ID),
      localStore.remove(AUTH_CACHE_KEYS.ROLE),
      localStore.remove(AUTH_CACHE_KEYS.PROFILE),
      localStore.remove(AUTH_CACHE_KEYS.LAST_SYNC_AT),
    ]);
  },
};
