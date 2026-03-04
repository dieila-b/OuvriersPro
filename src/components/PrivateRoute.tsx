import React, { useEffect, useMemo, useState } from "react";
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

  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [effectiveRole, setEffectiveRole] = useState<Role>("user");

  useEffect(() => {
    let mounted = true;

    const applySession = async (session: Session | null) => {
      const user = session?.user ?? null;

      if (!user?.id) {
        if (!mounted) return;
        setSessionUserId(null);
        setEffectiveRole("user");
        return;
      }

      if (!mounted) return;
      setSessionUserId(user.id);

      // fallback metadata si op_users indisponible
      const metaRole = normalizeRole(user.user_metadata?.role ?? user.app_metadata?.role ?? null);

      // role DB
      const { data: row, error } = await supabase
        .from("op_users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.warn("[PrivateRoute] op_users role fetch error:", error);
        setEffectiveRole(metaRole);
      } else {
        setEffectiveRole(row?.role ? normalizeRole(row.role) : metaRole);
      }
    };

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("[PrivateRoute] getSession error:", error);
          if (!mounted) return;
          setSessionUserId(null);
          setEffectiveRole("user");
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
  }, []);

  const allowed = useMemo(() => isRoleAllowed(effectiveRole, allowedRoles), [effectiveRole, allowedRoles]);

  if (loading) {
    if (!showLoader) return null;
    return <div className="min-h-[40vh] w-full flex items-center justify-center p-6 text-slate-600">Chargement…</div>;
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

  if (!allowed) return <Navigate to={forbiddenRedirectTo} replace />;

  return <>{children}</>;
}
