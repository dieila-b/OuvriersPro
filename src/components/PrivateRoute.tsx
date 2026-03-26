// src/components/PrivateRoute.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { authCache, normalizeRole } from "@/services/authCache";
import { useNetworkStatus } from "@/services/networkService";

type Role = "user" | "client" | "worker" | "admin";

type Props = {
  children: React.ReactNode;
  allowedRoles?: Role[];
  loginPath?: string;
  forbiddenRedirectTo?: string;
  showLoader?: boolean;
};

const normalizeEffectiveRole = (r: any): Role => {
  const v = normalizeRole(r);
  if (v === "admin") return "admin";
  if (v === "worker") return "worker";
  if (v === "client") return "client";
  return "user";
};

function isRoleAllowed(effective: Role, allowed: Role[]) {
  if (allowed.includes(effective)) return true;

  // tolérance user <-> client
  if (effective === "client" && allowed.includes("user")) return true;
  if (effective === "user" && allowed.includes("client")) return true;

  return false;
}

export default function PrivateRoute({
  children,
  allowedRoles = ["user", "client", "worker", "admin"],
  loginPath = "/login",
  forbiddenRedirectTo = "/",
  showLoader = true,
}: Props) {
  const location = useLocation();
  const { connected, initialized } = useNetworkStatus();

  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [effectiveRole, setEffectiveRole] = useState<Role>("user");

  useEffect(() => {
    let mounted = true;

    const safe = (fn: () => void) => {
      if (mounted) fn();
    };

    const restoreCachedSession = async (): Promise<boolean> => {
      try {
        const snapshot = await authCache.getSnapshot();

        if (!mounted) return false;

        if (snapshot.userId) {
          safe(() => {
            setSessionUserId(snapshot.userId ?? null);
            setEffectiveRole(normalizeEffectiveRole(snapshot.role));
          });
          return true;
        }

        return false;
      } catch (err) {
        console.warn("[PrivateRoute] restoreCachedSession error:", err);
        return false;
      }
    };

    const persistCachedSession = async (userId: string, role: Role) => {
      try {
        const currentProfile = await authCache.getProfile();
        await authCache.saveUser(userId, normalizeEffectiveRole(role), currentProfile);
      } catch (err) {
        console.warn("[PrivateRoute] persistCachedSession error:", err);
      }
    };

    const clearResolvedSession = async () => {
      safe(() => {
        setSessionUserId(null);
        setEffectiveRole("user");
      });

      try {
        await authCache.clear();
      } catch (err) {
        console.warn("[PrivateRoute] clearResolvedSession error:", err);
      }
    };

    const applyLiveSession = async (session: Session | null) => {
      const user = session?.user ?? null;

      if (!user?.id) {
        if (!connected) {
          const restored = await restoreCachedSession();
          if (!restored) {
            safe(() => {
              setSessionUserId(null);
              setEffectiveRole("user");
            });
          }
          return;
        }

        await clearResolvedSession();
        return;
      }

      safe(() => setSessionUserId(user.id));

      const metaRole = normalizeEffectiveRole(
        user.user_metadata?.role ?? user.app_metadata?.role ?? "user"
      );

      if (!connected) {
        safe(() => setEffectiveRole(metaRole));
        await persistCachedSession(user.id, metaRole);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("op_users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.warn("[PrivateRoute] DB role error:", error);
          safe(() => setEffectiveRole(metaRole));
          await persistCachedSession(user.id, metaRole);
          return;
        }

        const resolvedRole = normalizeEffectiveRole(data?.role ?? metaRole);

        safe(() => setEffectiveRole(resolvedRole));
        await persistCachedSession(user.id, resolvedRole);
      } catch (err) {
        console.warn("[PrivateRoute] role fetch exception:", err);

        if (!mounted) return;

        safe(() => setEffectiveRole(metaRole));
        await persistCachedSession(user.id, metaRole);
      }
    };

    const boot = async () => {
      safe(() => setLoading(true));

      try {
        if (!connected) {
          const restored = await restoreCachedSession();
          if (!restored) {
            safe(() => {
              setSessionUserId(null);
              setEffectiveRole("user");
            });
          }
          return;
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn("[PrivateRoute] getSession error:", error);
          await clearResolvedSession();
          return;
        }

        await applyLiveSession(data.session ?? null);
      } finally {
        safe(() => setLoading(false));
      }
    };

    if (initialized) {
      void boot();
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      safe(() => setLoading(true));

      void (async () => {
        await applyLiveSession(session ?? null);
        safe(() => setLoading(false));
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [connected, initialized]);

  const allowed = useMemo(
    () => isRoleAllowed(effectiveRole, allowedRoles),
    [effectiveRole, allowedRoles]
  );

  if (loading || !initialized) {
    if (!showLoader) return null;

    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center p-6 text-slate-600">
        Chargement…
      </div>
    );
  }

  if (!sessionUserId) {
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }

  if (!allowed) {
    return <Navigate to={forbiddenRedirectTo} replace />;
  }

  return <>{children}</>;
}
