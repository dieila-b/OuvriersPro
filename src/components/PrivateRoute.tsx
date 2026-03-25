import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
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

    const applyAnonymous = () => {
      if (!mounted) return;
      setSessionUserId(null);
      setEffectiveRole("user");
    };

    const applyCacheSnapshot = async () => {
      const snapshot = await authCache.getSnapshot();

      if (!mounted) return false;

      if (snapshot.userId) {
        setSessionUserId(snapshot.userId);
        setEffectiveRole(normalizeRole(snapshot.role));
        return true;
      }

      applyAnonymous();
      return false;
    };

    const applyLiveSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn("[PrivateRoute] getSession error:", error);
          return await applyCacheSnapshot();
        }

        const user = data?.session?.user ?? null;

        if (!user?.id) {
          return await applyCacheSnapshot();
        }

        const metaRole = normalizeRole(
          user.user_metadata?.role ?? user.app_metadata?.role ?? null
        );

        let resolvedRole: Role = metaRole;

        if (connected) {
          try {
            const { data: row, error: rowError } = await supabase
              .from("op_users")
              .select("role")
              .eq("id", user.id)
              .maybeSingle();

            if (rowError) {
              console.warn("[PrivateRoute] op_users role fetch error:", rowError);
            } else if (row?.role) {
              resolvedRole = normalizeRole(row.role);
            }
          } catch (error) {
            console.warn("[PrivateRoute] role resolution exception:", error);
          }
        }

        const cachedProfile = await authCache.getProfile();

        await authCache.saveUser(
          user.id,
          resolvedRole,
          typeof cachedProfile === "undefined" ? undefined : cachedProfile
        );

        if (!mounted) return true;

        setSessionUserId(user.id);
        setEffectiveRole(resolvedRole);
        return true;
      } catch (error) {
        console.warn("[PrivateRoute] applyLiveSession exception:", error);
        return await applyCacheSnapshot();
      }
    };

    const load = async () => {
      setLoading(true);

      try {
        if (!initialized) return;

        if (!connected) {
          await applyCacheSnapshot();
          return;
        }

        await applyLiveSession();
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
          const user = session?.user ?? null;

          if (!user?.id) {
            if (!connected) {
              await applyCacheSnapshot();
            } else {
              const restored = await applyCacheSnapshot();
              if (!restored) {
                applyAnonymous();
              }
            }
            return;
          }

          const metaRole = normalizeRole(
            user.user_metadata?.role ?? user.app_metadata?.role ?? null
          );

          let resolvedRole: Role = metaRole;

          if (connected) {
            try {
              const { data: row, error } = await supabase
                .from("op_users")
                .select("role")
                .eq("id", user.id)
                .maybeSingle();

              if (!error && row?.role) {
                resolvedRole = normalizeRole(row.role);
              }
            } catch (error) {
              console.warn("[PrivateRoute] onAuthStateChange role fetch error:", error);
            }
          }

          const cachedProfile = await authCache.getProfile();
          await authCache.saveUser(
            user.id,
            resolvedRole,
            typeof cachedProfile === "undefined" ? undefined : cachedProfile
          );

          if (!mounted) return;

          setSessionUserId(user.id);
          setEffectiveRole(resolvedRole);
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
