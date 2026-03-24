import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { localStore } from "@/services/localStore";
import { useNetworkStatus } from "@/services/networkService";

type Role = "user" | "client" | "worker" | "admin";

type Props = {
  children: React.ReactNode;
  allowedRoles?: Role[];
  loginPath?: string;
  forbiddenRedirectTo?: string;
  showLoader?: boolean;
};

const LOCAL_ROLE_KEY = "local_auth_role";
const LOCAL_USER_ID_KEY = "local_auth_user_id";

const normalizeRole = (r: any): Role => {
  const v = String(r ?? "").toLowerCase().trim();

  if (v === "admin") return "admin";
  if (v === "worker" || v === "ouvrier" || v === "provider" || v === "prestataire") return "worker";
  if (v === "client" || v === "customer") return "client";
  if (v === "user" || v === "particulier") return "user";

  return "user";
};

function isRoleAllowed(effective: Role, allowed: Role[]) {
  if (allowed.includes(effective)) return true;
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

    const setAnonymousState = async () => {
      if (!mounted) return;

      setSessionUserId(null);
      setEffectiveRole("user");

      try {
        await localStore.remove(LOCAL_USER_ID_KEY);
        await localStore.remove(LOCAL_ROLE_KEY);
      } catch (error) {
        console.warn("[PrivateRoute] local clear warning:", error);
      }
    };

    const restoreLocalFallback = async () => {
      try {
        const [cachedUserId, cachedRole] = await Promise.all([
          localStore.get<string>(LOCAL_USER_ID_KEY),
          localStore.get<Role>(LOCAL_ROLE_KEY),
        ]);

        if (!mounted) return;

        if (cachedUserId) {
          setSessionUserId(cachedUserId);
          setEffectiveRole(normalizeRole(cachedRole ?? "user"));
          return true;
        }

        return false;
      } catch (error) {
        console.warn("[PrivateRoute] local fallback restore warning:", error);
        return false;
      }
    };

    const persistLocalFallback = async (userId: string, role: Role) => {
      try {
        await Promise.all([
          localStore.set(LOCAL_USER_ID_KEY, userId),
          localStore.set(LOCAL_ROLE_KEY, role),
        ]);
      } catch (error) {
        console.warn("[PrivateRoute] local persist warning:", error);
      }
    };

    const applySession = async (session: Session | null) => {
      const user = session?.user ?? null;

      if (!user?.id) {
        const restored = await restoreLocalFallback();

        if (!restored) {
          await setAnonymousState();
        }

        return;
      }

      if (!mounted) return;

      setSessionUserId(user.id);

      const metaRole = normalizeRole(
        user.user_metadata?.role ?? user.app_metadata?.role ?? null
      );

      /**
       * Offline-first:
       * - si pas de réseau, on garde le rôle metadata
       * - si réseau, on essaie op_users
       * - en cas d'erreur, fallback metadata
       */
      if (!connected && initialized) {
        setEffectiveRole(metaRole);
        await persistLocalFallback(user.id, metaRole);
        return;
      }

      try {
        const { data: row, error } = await supabase
          .from("op_users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.warn("[PrivateRoute] op_users role fetch error:", error);
          setEffectiveRole(metaRole);
          await persistLocalFallback(user.id, metaRole);
          return;
        }

        const resolvedRole = row?.role ? normalizeRole(row.role) : metaRole;
        setEffectiveRole(resolvedRole);
        await persistLocalFallback(user.id, resolvedRole);
      } catch (error) {
        console.warn("[PrivateRoute] role resolution exception:", error);

        if (!mounted) return;

        setEffectiveRole(metaRole);
        await persistLocalFallback(user.id, metaRole);
      }
    };

    const load = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn("[PrivateRoute] getSession error:", error);

          const restored = await restoreLocalFallback();
          if (!restored) {
            await setAnonymousState();
          }

          return;
        }

        await applySession(data.session ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (!mounted) return;

        setLoading(true);

        try {
          await applySession(session ?? null);
        } finally {
          if (mounted) setLoading(false);
        }
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
