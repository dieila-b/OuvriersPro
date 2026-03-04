// src/components/PrivateRoute.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type Role = "user" | "client" | "worker" | "admin";

type Props = {
  children: React.ReactNode;
  allowedRoles?: Role[];
  loginPath?: string;
  forbiddenRedirectTo?: string;
  showLoader?: boolean;
};

const normalizeRole = (r: any): Role => {
  const v = String(r ?? "").toLowerCase().trim();

  if (v === "admin") return "admin";
  if (v === "worker" || v === "ouvrier" || v === "provider" || v === "prestataire") return "worker";
  if (v === "client" || v === "customer") return "client";
  if (v === "user" || v === "particulier") return "user";

  // fallback safe
  return "user";
};

function isRoleAllowed(effective: Role, allowed: Role[]) {
  if (allowed.includes(effective)) return true;
  // équivalences client/user
  if (effective === "client" && allowed.includes("user")) return true;
  if (effective === "user" && allowed.includes("client")) return true;
  return false;
}

/**
 * ✅ Source de vérité stable (web + mobile + webview):
 * - session via getSession() + onAuthStateChange()
 * - rôle via table op_users (source de vérité) + fallback metadata
 *
 * ⚠️ Ne JAMAIS utiliser supabase.auth.getUser() dans un guard:
 * - peut lever AuthSessionMissingError en environnement sans session (normal)
 * - casse la navigation sur WebView/Android
 */
export default function PrivateRoute({
  children,
  allowedRoles = ["user", "client", "worker", "admin"],
  loginPath = "/login",
  forbiddenRedirectTo = "/",
  showLoader = true,
}: Props) {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [effectiveRole, setEffectiveRole] = useState<Role>("user");

  const mountedRef = useRef(false);
  const seqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    const safe = (fn: () => void) => {
      if (mountedRef.current) fn();
    };

    const resolveRole = async (session: Session | null) => {
      const seq = ++seqRef.current;

      const user = session?.user ?? null;

      // Pas connecté => état normal
      if (!user?.id) {
        if (!mountedRef.current || seq !== seqRef.current) return;
        safe(() => {
          setSessionUserId(null);
          setEffectiveRole("user");
          setLoading(false);
        });
        return;
      }

      // user ok
      const userId = user.id;
      const metaRole = normalizeRole(user.user_metadata?.role ?? user.app_metadata?.role ?? null);

      // On met déjà l'ID, et un rôle fallback immédiat
      safe(() => {
        setSessionUserId(userId);
        setEffectiveRole(metaRole);
      });

      // Puis on tente le rôle DB (source de vérité)
      const { data: row, error } = await supabase
        .from("op_users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (!mountedRef.current || seq !== seqRef.current) return;

      if (error) {
        // si RLS bloque op_users, on garde metadata
        console.warn("[PrivateRoute] op_users role fetch error:", error);
        safe(() => setEffectiveRole(metaRole));
      } else {
        const dbRole = row?.role ?? null;
        safe(() => setEffectiveRole(dbRole ? normalizeRole(dbRole) : metaRole));
      }

      safe(() => setLoading(false));
    };

    const load = async () => {
      safe(() => setLoading(true));

      const { data, error } = await supabase.auth.getSession();

      if (!mountedRef.current) return;

      if (error) {
        console.warn("[PrivateRoute] getSession error:", error);
        safe(() => {
          setSessionUserId(null);
          setEffectiveRole("user");
          setLoading(false);
        });
        return;
      }

      await resolveRole(data.session ?? null);
    };

    // initial
    void load();

    // changements session
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // ne pas bloquer le thread UI
      safe(() => setLoading(true));
      void resolveRole(session ?? null);
    });

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const allowed = useMemo(
    () => isRoleAllowed(effectiveRole, allowedRoles),
    [effectiveRole, allowedRoles]
  );

  if (loading) {
    if (!showLoader) return null;
    return (
      <div className="min-h-[40vh] w-full flex items-center justify-center p-6 text-slate-600">
        Chargement…
      </div>
    );
  }

  // pas de session => login
  if (!sessionUserId) {
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }

  // session ok mais rôle non autorisé
  if (!allowed) return <Navigate to={forbiddenRedirectTo} replace />;

  return <>{children}</>;
}
