import { authCache, normalizeRole } from "@/services/authCache";
import { networkService } from "@/services/networkService";
import { supabase } from "@/lib/supabase";

export type OfflineResolvedSession = {
  userId: string | null;
  isAuthenticated: boolean;
  isOffline: boolean;
  role: "user" | "client" | "worker" | "admin";
  source: "live" | "cache" | "none";
};

export async function resolveOfflineSession(): Promise<OfflineResolvedSession> {
  const { connected } = networkService.getStatus();

  if (!connected) {
    const snapshot = await authCache.getSnapshot();
    return {
      userId: snapshot.userId ?? null,
      isAuthenticated: !!snapshot.userId,
      isOffline: true,
      role: normalizeRole(snapshot.role),
      source: snapshot.userId ? "cache" : "none",
    };
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    if (!error && data?.session?.user?.id) {
      const user = data.session.user;
      const role = normalizeRole(
        user.user_metadata?.role ?? user.app_metadata?.role ?? null
      );

      await authCache.saveUser(user.id, role);

      return {
        userId: user.id,
        isAuthenticated: true,
        isOffline: false,
        role,
        source: "live",
      };
    }
  } catch (error) {
    console.warn("[offlineSession] live session failed, fallback cache:", error);
  }

  const snapshot = await authCache.getSnapshot();

  return {
    userId: snapshot.userId ?? null,
    isAuthenticated: !!snapshot.userId,
    isOffline: !connected,
    role: normalizeRole(snapshot.role),
    source: snapshot.userId ? "cache" : "none",
  };
}

export async function getEffectiveUserId(): Promise<string | null> {
  const resolved = await resolveOfflineSession();
  return resolved.userId;
}

export async function isAuthenticatedOfflineSafe(): Promise<boolean> {
  const resolved = await resolveOfflineSession();
  return resolved.isAuthenticated;
}
