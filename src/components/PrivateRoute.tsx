// src/components/PrivateRoute.tsx
import React, { useEffect, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type Role = "user" | "worker" | "admin";

type Props = {
  children: React.ReactNode;
  allowedRoles?: Role[];
  /** Route vers laquelle on envoie si pas connecté */
  loginPath?: string;
  /** Route vers laquelle on envoie si connecté mais rôle non autorisé */
  forbiddenRedirectTo?: string;
  /** Affiche un mini loader pendant la vérif session */
  showLoader?: boolean;
};

function useSupabaseSession() {
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<any>(null);

  useEffect(() => {
    let mounted = true;

    // 1) session initiale
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data?.session ?? null);
      setLoading(false);
    });

    // 2) updates
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
 * ✅ PrivateRoute robuste:
 * - ne bloque pas silencieusement
 * - attend la session avant de rediriger
 * - redirige vers /login si non connecté
 * - check rôle via user_metadata.role OU app_metadata.role
 */
const PrivateRoute: React.FC<Props> = ({
  children,
  allowedRoles = ["user", "worker", "admin"],
  loginPath = "/login",
  forbiddenRedirectTo = "/",
  showLoader = true,
}) => {
  const location = useLocation();
  const { loading, session } = useSupabaseSession();

  const role = useMemo<Role | null>(() => {
    const u = session?.user;
    if (!u) return null;

    const r =
      (u.user_metadata?.role as Role | undefined) ||
      (u.app_metadata?.role as Role | undefined) ||
      null;

    return r;
  }, [session]);

  // ✅ Pendant le chargement, on ne redirige pas (évite clignotement + “rien ne se passe”)
  if (loading) {
    if (!showLoader) return null;
    return (
      <div className="min-h-[40vh] w-full flex items-center justify-center p-6 text-slate-600">
        Chargement…
      </div>
    );
  }

  // ✅ Pas connecté → login, en gardant la route voulue pour retour après connexion
  if (!session?.user) {
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }

  // ✅ Connecté mais rôle absent → on considère "user" par défaut (à adapter si tu préfères bloquer)
  const effectiveRole: Role = (role ?? "user") as Role;

  // ✅ Rôle non autorisé → redirection
  if (!allowedRoles.includes(effectiveRole)) {
    return <Navigate to={forbiddenRedirectTo} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
