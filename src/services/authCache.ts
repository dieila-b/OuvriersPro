// src/services/authCache.ts
import { localStore } from "@/services/localStore";

export type Role = "user" | "client" | "worker" | "admin";

export const AUTH_CACHE_KEYS = {
  USER_ID: "local_auth_user_id",
  ROLE: "local_auth_role",
  PROFILE: "local_auth_profile",
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
  async saveUser(userId: string, role: Role, profile?: Record<string, any> | null) {
    await Promise.all([
      localStore.set(AUTH_CACHE_KEYS.USER_ID, userId),
      localStore.set(AUTH_CACHE_KEYS.ROLE, role),
      profile ? localStore.set(AUTH_CACHE_KEYS.PROFILE, profile) : Promise.resolve(),
    ]);
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

  async clear() {
    await Promise.all([
      localStore.remove(AUTH_CACHE_KEYS.USER_ID),
      localStore.remove(AUTH_CACHE_KEYS.ROLE),
      localStore.remove(AUTH_CACHE_KEYS.PROFILE),
    ]);
  },
};
