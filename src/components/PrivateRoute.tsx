// src/components/PrivateRoute.tsx
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

/**
 * Normalisation des rôles
 */
const normalizeRole = (r: any): Role => {
  const v = String(r ?? "").toLowerCase().trim();

  if (v === "admin") return "admin";
  if (["worker", "ouvrier", "provider", "prestataire"].includes(v)) return "worker";
  if (["client", "customer"].includes(v)) return "client";
  if (["user", "particulier"].includes(v)) return "user";

  return "user";
};

/**
 * Vérification autorisation
 */
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

    /**
     * Restore OFFLINE session
     */
    const restoreLocalSession = async (): Promise<boolean> => {
      try {
        const [uid, role] = await Promise.all([
          localStore.get<string>(LOCAL_USER_ID_KEY),
          localStore.get<Role>(LOCAL_ROLE_KEY),
        ]);

        if (!mounted) return false;

        if (uid) {
          safe(() => {
            setSessionUserId(uid);
            setEffectiveRole(normalizeRole(role));
          });
          return true;
        }

        return false;
      } catch (err) {
        console.warn("[PrivateRoute] restoreLocalSession error:", err);
        return false;
      }
    };

    /**
     * Save local session (offline-first)
     */
    const persistLocalSession = async (userId: string, role: Role) => {
      try {
        await Promise.all([
          localStore.set(LOCAL_USER_ID_KEY, userId),
          localStore.set(LOCAL_ROLE_KEY, role),
        ]);
      } catch (err) {
        console.warn("[PrivateRoute] persistLocalSession error:", err);
      }
    };

    /**
     * Clear session
     */
    const clearSession = async () => {
      safe(() => {
        setSessionUserId(null);
        setEffectiveRole("user");
      });

      try {
        await Promise.all([
          localStore.remove(LOCAL_USER_ID_KEY),
          localStore.remove(LOCAL_ROLE_KEY),
        ]);
      } catch (err) {
        console.warn("[PrivateRoute] clearSession error:", err);
      }
    };

    /**
     * Appliquer session
     */
    const applySession = async (session: Session | null) => {
      const user = session?.user;

      /**
       * ❌ Pas de session → fallback local
       */
      if (!user?.id) {
        const restored = await restoreLocalSession();
        if (!restored) {
          await clearSession();
        }
        return;
      }

      /**
       * ✅ Session valide
       */
      safe(() => setSessionUserId(user.id));

      const metaRole = normalizeRole(
        user.user_metadata?.role ?? user.app_metadata?.role
      );

      /**
       * 🔴 OFFLINE → utiliser metadata directement
       */
      if (!connected && initialized) {
        safe(() => setEffectiveRole(metaRole));
        await persistLocalSession(user.id, metaRole);
        return;
      }

      /**
       * 🟢 ONLINE → essayer Supabase
       */
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
          await persistLocalSession(user.id, metaRole);
          return;
        }

        const role = data?.role ? normalizeRole(data.role) : metaRole;

        safe(() => setEffectiveRole(role));
        await persistLocalSession(user.id, role);
      } catch (err) {
        console.warn("[PrivateRoute] role fetch exception:", err);

        if (!mounted) return;

        safe(() => setEffectiveRole(metaRole));
        await persistLocalSession(user.id, metaRole);
      }
    };

    /**
     * Boot
     */
    const boot = async () => {
      safe(() => setLoading(true));

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn("[PrivateRoute] getSession error:", error);

          const restored = await restoreLocalSession();
          if (!restored) await clearSession();

          return;
        }

        await applySession(data.session ?? null);
      } finally {
        safe(() => setLoading(false));
      }
    };

    void boot();

    /**
     * Listener auth
     */
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      safe(() => setLoading(true));
      void (async () => {
        await applySession(session ?? null);
        safe(() => setLoading(false));
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [connected, initialized]);

  /**
   * Autorisation
   */
  const allowed = useMemo(
    () => isRoleAllowed(effectiveRole, allowedRoles),
    [effectiveRole, allowedRoles]
  );

  /**
   * Loader
   */
  if (loading || !initialized) {
    if (!showLoader) return null;

    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center p-6 text-slate-600">
        Chargement…
      </div>
    );
  }

  /**
   * ❌ Pas connecté
   */
  if (!sessionUserId) {
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }

  /**
   * ❌ Pas autorisé
   */
  if (!allowed) {
    return <Navigate to={forbiddenRedirectTo} replace />;
  }

  /**
   * ✅ OK
   */
  return <>{children}</>;
}
