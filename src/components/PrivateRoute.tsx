// src/components/PrivateRoute.tsx
import React, { useEffect, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

// Rôles acceptés
type Role = "user" | "client" | "worker" | "admin";

type Props = {
  children: React.ReactNode;
  allowedRoles?: Role[];
  loginPath?: string;
  forbiddenRedirectTo?: string;
  showLoader?: boolean;
};

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

/**
 * ✅ Session hook robuste
 * - récupère getSession()
 * - si une session est annoncée, on la VALIDE via getUser()
 *   -> si getUser() renvoie AuthSessionMissingError (ou autre), on force session=null
 */
function useSupabaseSessionValidated() {
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const validate = async (incomingSession: any) => {
      if (!incomingSession?.access_token) return null;

      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          // session invalide / expirée / introuvable
          return null;
        }
        return incomingSession;
      } catch {
        return null;
      }
    };

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const s = data?.session ?? null;

        const validated = await validate(s);
        if (!mounted) return;

        setSession(validated);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, newSession) => {
      const validated = await validate(newSession ?? null);
      if (!mounted) return;
      setSession(validated);
      setLoading(false);
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
          console.warn("[PrivateRoute] profiles role fetch error:", error);
          setRole(null);
        } else {
          setRole(normalizeRole((data as any)?.role) ?? null);
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

const PrivateRoute: React.FC<Props> = ({
  children,
  allowedRoles = ["user", "client", "worker", "admin"],
  loginPath = "/login",
  forbiddenRedirectTo = "/",
  showLoader = true,
}) => {
  const location = useLocation();
  const { loading: sessionLoading, session } = useSupabaseSessionValidated();

  const userId = session?.user?.id ?? null;

  const metaRole = useMemo<Role | null>(() => {
    const u = session?.user;
    if (!u) return null;
    return (
      normalizeRole(u.user_metadata?.role) ||
      normalizeRole(u.app_metadata?.role) ||
      null
    );
  }, [session]);

  const { loading: profileLoading, role: profileRole } = useProfileRole(userId);

  // rôle effectif : metadata > profiles > "user"
  const effectiveRole: Role = (metaRole ?? profileRole ?? "user") as Role;

  // loader tant que tout n’est pas stable
  const loading = sessionLoading || (session?.user && profileLoading);

  if (loading) {
    if (!showLoader) return null;
    return (
      <div className="min-h-[40vh] w-full flex items-center justify-center p-6 text-slate-600">
        Chargement…
      </div>
    );
  }

  // ✅ pas de user -> go login (c’est ça qui doit arriver chez toi)
  if (!session?.user) {
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }

  // ✅ règles d’équivalence : "client" et "user" sont acceptés si l’un des deux est autorisé
  const allowed =
    allowedRoles.includes(effectiveRole) ||
    (effectiveRole === "client" && allowedRoles.includes("user")) ||
    (effectiveRole === "user" && allowedRoles.includes("client"));

  if (!allowed) return <Navigate to={forbiddenRedirectTo} replace />;

  return <>{children}</>;
};

export default PrivateRoute;
