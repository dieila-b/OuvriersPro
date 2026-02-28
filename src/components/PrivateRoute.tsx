// src/components/PrivateRoute.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type Role = "user" | "client" | "worker" | "admin";

type Props = {
  children: React.ReactNode;
  allowedRoles?: Role[];
  loginPath?: string;
  forbiddenRedirectTo?: string;
  showLoader?: boolean;
};

const normalizeRole = (r: any): Role => {
  const v = String(r ?? "")
    .toLowerCase()
    .trim();

  if (v === "admin") return "admin";
  if (v === "worker" || v === "ouvrier" || v === "provider" || v === "prestataire") return "worker";
  if (v === "client" || v === "customer") return "client";
  if (v === "user" || v === "particulier") return "user";

  // fallback safe
  return "user";
};

function isRoleAllowed(effective: Role, allowed: Role[]) {
  // équivalences client/user
  if (allowed.includes(effective)) return true;
  if (effective === "client" && allowed.includes("user")) return true;
  if (effective === "user" && allowed.includes("client")) return true;
  return false;
}

/**
 * ✅ Source de vérité UNIQUE :
 * - session via getSession() + validation via getUser()
 * - rôle via table op_users (et fallback metadata si besoin)
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

  useEffect(() => {
    let mounted = true;

    const validateSession = async (incomingSession: any) => {
      if (!incomingSession?.access_token) return null;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) return null;
        return incomingSession;
      } catch {
        return null;
      }
    };

    const load = async () => {
      setLoading(true);

      try {
        const { data } = await supabase.auth.getSession();
        const validated = await validateSession(data?.session ?? null);

        if (!mounted) return;

        const user = validated?.user ?? null;
        if (!user?.id) {
          setSessionUserId(null);
          setEffectiveRole("user");
          setLoading(false);
          return;
        }

        setSessionUserId(user.id);

        // 1) rôle metadata (fallback)
        const metaRole = normalizeRole(user.user_metadata?.role ?? user.app_metadata?.role ?? null);

        // 2) rôle op_users (source de vérité)
        const { data: row, error } = await supabase
          .from("op_users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          // si RLS bloque op_users, on garde metadata
          console.warn("[PrivateRoute] op_users role fetch error:", error);
          setEffectiveRole(metaRole);
        } else {
          const dbRole = row?.role ?? null;
          setEffectiveRole(dbRole ? normalizeRole(dbRole) : metaRole);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      await load();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const allowed = useMemo(() => isRoleAllowed(effectiveRole, allowedRoles), [effectiveRole, allowedRoles]);

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
