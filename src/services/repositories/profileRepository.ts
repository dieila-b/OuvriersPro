// src/services/repositories/profileRepository.ts
import { supabase } from "@/lib/supabase";
import { localStore } from "@/services/localStore";
import { authCache, normalizeRole } from "@/services/authCache";
import { syncService } from "@/services/syncService";
import { networkService } from "@/services/networkService";

const PROFILE_CACHE_KEY = "cached_op_user_profile";

export type CachedProfile = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  [key: string]: any;
};

export const profileRepository = {
  async getMyProfile(userId: string): Promise<CachedProfile | null> {
    const { connected } = networkService.getStatus();

    if (connected) {
      const { data, error } = await supabase
        .from("op_users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        await localStore.set(PROFILE_CACHE_KEY, data);
        await authCache.saveUser(userId, normalizeRole(data.role), data);
        return data as CachedProfile;
      }
    }

    const cached = await localStore.get<CachedProfile>(PROFILE_CACHE_KEY);
    if (cached?.id === userId) return cached;

    const cachedAuthProfile = await authCache.getProfile<CachedProfile>();
    if (cachedAuthProfile?.id === userId) return cachedAuthProfile;

    return null;
  },

  async updateMyProfile(userId: string, values: Partial<CachedProfile>) {
    const { connected } = networkService.getStatus();

    const current = await this.getMyProfile(userId);
    const optimistic = {
      ...(current ?? { id: userId }),
      ...values,
    };

    await localStore.set(PROFILE_CACHE_KEY, optimistic);
    await authCache.saveUser(
      userId,
      normalizeRole(optimistic.role ?? current?.role ?? "user"),
      optimistic
    );

    if (!connected) {
      await syncService.enqueue("UPDATE_PROFILE", {
        userId,
        values,
      });

      return {
        data: optimistic,
        offline: true,
      };
    }

    const { data, error } = await supabase
      .from("op_users")
      .update(values)
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    if (error) throw error;

    const finalProfile = (data ?? optimistic) as CachedProfile;

    await localStore.set(PROFILE_CACHE_KEY, finalProfile);
    await authCache.saveUser(
      userId,
      normalizeRole(finalProfile.role ?? "user"),
      finalProfile
    );

    return {
      data: finalProfile,
      offline: false,
    };
  },
};
