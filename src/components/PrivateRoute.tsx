// src/components/PrivateRoute.tsx
import React, { useEffect, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

// ✅ on ajoute "client" comme alias possible
type Role = "user" | "client" | "worker" | "admin";

type Props = {
  children: React.ReactNode;
  allowedRoles?: Role[];
  loginPath?: string;
  forbiddenRedirectTo?: string;
  showLoader?: boolean;
};

function useSupabaseSession() {
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<any>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data?.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, newSession) => {
      if (!mounted) return;
      setSession(newSession ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { loading, session };
}

/**
 * ✅ Récupération rôle depuis table profiles si metadata absente
 * - suppose table: profiles (ou public.profiles) avec colonne "role"
 * - si ta colonne s'appelle autrement (ex: user_type), dis-moi et j’adapte
 */
function useProfileRole(userId: string | null) {
  const [loading, setLoading] = React.useState(false);
  const [role, setRole] = React.useState<Role | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!userId) {
      setRole(null);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          // pas bloquant
          console.warn("[PrivateRoute] profiles role fetch error:", error);
          setRole(null);
        } else {
          const r = (data?.role ?? null) as Role | null;
          setRole(r);
        }
      } catch (e) {
        if (!mounted) return;
        console.warn("[PrivateRoute] profiles role fetch exception:", e);
        setRole(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { loading, role };
}

const normalizeRole = (r: string | null | undefined): Role | null => {
  if (!r) return null;
  const v = String(r).toLowerCase().trim();
  if (v === "customer") return "client";
  if (v === "provider") return "worker";
  if (v === "prestataire") return "worker";
  if (v === "client") return "client";
  if (v === "user") return "user";
  if (v === "worker") return "worker";
  if (v === "admin") return "admin";
  return null;
};

const PrivateRoute: React.FC<Props> = ({
  children,
  allowedRoles = ["user", "client", "worker", "admin"],
  loginPath = "/login",
  forbiddenRedirectTo = "/",
  showLoader = true,
}) => {
  const location = useLocation();
  const { loading: sessionLoading, session } = useSupabaseSession();

  const userId = session?.user?.id ?? null;

  const metaRole = useMemo<Role | null>(() => {
    const u = session?.user;
    if (!u) return null;

    const r =
      normalizeRole(u.user_metadata?.role) ||
      normalizeRole(u.app_metadata?.role) ||
      null;

    return r;
  }, [session]);

  const { loading: profileLoading, role: profileRole } = useProfileRole(userId);

  // ✅ rôle effectif : metadata > profiles > défaut "user"
  const effectiveRole: Role = (metaRole ?? normalizeRole(profileRole) ?? "user") as Role;

  // ✅ loader tant que session ou role DB n’est pas prêt (évite les “rien ne se passe”)
  const loading = sessionLoading || (session?.user && profileLoading);

  if (loading) {
    if (!showLoader) return null;
    return (
      <div className="min-h-[40vh] w-full flex items-center justify-center p-6 text-slate-600">
        Chargement…
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }

  // ✅ règle: client = user (synonyme)
  const roleForAuth: Role = effectiveRole === "client" ? "user" : effectiveRole;

  // ✅ autorisations : si allowedRoles contient user, on accepte aussi client
  const allowed = allowedRoles.includes(roleForAuth) || (roleForAuth === "user" && allowedRoles.includes("client"));

  if (!allowed) {
    return <Navigate to={forbiddenRedirectTo} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
