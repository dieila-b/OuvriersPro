import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { authCache, normalizeRole } from "@/services/authCache";
import { localStore } from "@/services/localStore";
import { networkService } from "@/services/networkService";

type UserRole = "user" | "admin" | "worker";

interface OpUserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email?: string | null;
  role: UserRole;
}

const PROFILE_CACHE_KEY_PREFIX = "cached_op_user_profile";

function getProfileCacheKey(userId?: string | null) {
  return userId ? `${PROFILE_CACHE_KEY_PREFIX}:${userId}` : PROFILE_CACHE_KEY_PREFIX;
}

function normalizeProfileRole(role: any): UserRole {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "admin";
  if (normalized === "worker") return "worker";
  return "user";
}

function buildOfflineUser(userId: string, profile?: OpUserProfile | null): User {
  return {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: profile?.email ?? undefined,
    phone: profile?.phone ?? undefined,
    created_at: new Date(0).toISOString(),
    app_metadata: {},
    user_metadata: {
      full_name: profile?.full_name ?? null,
      role: profile?.role ?? "user",
      offline_cached: true,
    },
  } as User;
}

async function readCachedProfile(userId: string): Promise<OpUserProfile | null> {
  try {
    const cacheKey = getProfileCacheKey(userId);

    const [cachedProfile, cachedAuthProfile, cachedRole] = await Promise.all([
      localStore.get<OpUserProfile>(cacheKey),
      authCache.getProfile<OpUserProfile>(),
      authCache.getRole(),
    ]);

    if (cachedProfile?.id === userId) {
      return {
        ...cachedProfile,
        role: normalizeProfileRole(cachedProfile.role ?? cachedRole ?? "user"),
      };
    }

    if (cachedAuthProfile?.id === userId) {
      return {
        ...cachedAuthProfile,
        role: normalizeProfileRole(cachedAuthProfile.role ?? cachedRole ?? "user"),
      };
    }

    return {
      id: userId,
      full_name: null,
      phone: null,
      email: null,
      role: normalizeProfileRole(cachedRole ?? "user"),
    };
  } catch (error) {
    console.warn("[useAuthProfile] readCachedProfile warning:", error);
    return null;
  }
}

async function persistProfile(profile: OpUserProfile) {
  try {
    const cacheKey = getProfileCacheKey(profile.id);

    await Promise.all([
      localStore.set(cacheKey, profile),
      authCache.saveUser(profile.id, normalizeProfileRole(profile.role), profile),
    ]);
  } catch (error) {
    console.warn("[useAuthProfile] persistProfile warning:", error);
  }
}

async function fetchProfile(userId: string): Promise<OpUserProfile | null> {
  const { connected } = networkService.getStatus();

  if (!connected) {
    return readCachedProfile(userId);
  }

  const { data, error } = await supabase
    .from("op_users")
    .select("id, full_name, phone, role, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[useAuthProfile] fetchProfile error:", error);
    return readCachedProfile(userId);
  }

  const profile = data
    ? ({
        ...(data as OpUserProfile),
        role: normalizeProfileRole((data as OpUserProfile).role),
      } as OpUserProfile)
    : null;

  if (profile) {
    await persistProfile(profile);
    return profile;
  }

  return readCachedProfile(userId);
}

export function useAuthProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OpUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const seqRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const safe = (fn: () => void) => {
      if (mountedRef.current) fn();
    };

    const applyCachedUser = async () => {
      const cachedUserId = await authCache.getUserId();

      if (!cachedUserId) {
        safe(() => {
          setUser(null);
          setProfile(null);
          setLoading(false);
        });
        return;
      }

      const cachedProfile = await readCachedProfile(cachedUserId);
      const offlineUser = buildOfflineUser(cachedUserId, cachedProfile);

      safe(() => {
        setUser(offlineUser);
        setProfile(cachedProfile);
        setLoading(false);
      });
    };

    const applySession = async (session: Session | null) => {
      const seq = ++seqRef.current;
      const u = session?.user ?? null;
      const { connected } = networkService.getStatus();

      if (!u) {
        const cachedUserId = await authCache.getUserId();

        if (cachedUserId) {
          const cachedProfile = await readCachedProfile(cachedUserId);

          if (!mountedRef.current || seq !== seqRef.current) return;

          safe(() => {
            setUser(buildOfflineUser(cachedUserId, cachedProfile));
            setProfile(cachedProfile);
            setLoading(false);
          });
          return;
        }

        if (!connected) {
          await applyCachedUser();
          return;
        }

        safe(() => {
          setUser(null);
          setProfile(null);
          setLoading(false);
        });
        return;
      }

      safe(() => setUser(u));

      const metaRole = normalizeProfileRole(
        u.user_metadata?.role ?? u.app_metadata?.role ?? null
      );

      await authCache.saveUser(u.id, metaRole);

      const p = await fetchProfile(u.id);

      if (!mountedRef.current || seq !== seqRef.current) return;

      const resolvedProfile =
        p ??
        ({
          id: u.id,
          full_name:
            (u.user_metadata?.full_name as string | undefined) ??
            (u.user_metadata?.name as string | undefined) ??
            null,
          phone: (u.user_metadata?.phone as string | undefined) ?? null,
          email: u.email ?? null,
          role: metaRole,
        } satisfies OpUserProfile);

      await persistProfile(resolvedProfile);

      safe(() => {
        setUser(u);
        setProfile(resolvedProfile);
        setLoading(false);
      });
    };

    const bootstrap = async () => {
      safe(() => setLoading(true));

      const { connected } = networkService.getStatus();

      if (!connected) {
        await applyCachedUser();
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (!mountedRef.current) return;

      if (error) {
        console.warn("[useAuthProfile] getSession error:", error);
        await applyCachedUser();
        return;
      }

      await applySession(data.session ?? null);
    };

    void bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      safe(() => setLoading(true));
      void applySession(session ?? null);
    });

    const unsubscribeNetwork = networkService.subscribe(() => {
      const status = networkService.getStatus();

      if (!mountedRef.current) return;

      if (!status.connected) {
        void applyCachedUser();
        return;
      }

      const currentSeq = ++seqRef.current;

      safe(() => setLoading(true));

      void (async () => {
        const liveUserId = user?.id ?? (await authCache.getUserId());

        if (!liveUserId) {
          if (!mountedRef.current || currentSeq !== seqRef.current) return;
          safe(() => {
            setUser(null);
            setProfile(null);
            setLoading(false);
          });
          return;
        }

        const refreshed = await fetchProfile(liveUserId);

        if (!mountedRef.current || currentSeq !== seqRef.current) return;

        safe(() => {
          setUser(buildOfflineUser(liveUserId, refreshed));
          if (refreshed) setProfile(refreshed);
          setLoading(false);
        });
      })();
    });

    return () => {
      mountedRef.current = false;
      listener.subscription.unsubscribe();
      unsubscribeNetwork();
    };
  }, []);

  const flags = useMemo(() => {
    const role = normalizeProfileRole(profile?.role ?? "user");
    return {
      isAdmin: role === "admin",
      isWorker: role === "worker",
      isClient: role === "user",
    };
  }, [profile?.role]);

  return { user, profile, ...flags, loading };
}
