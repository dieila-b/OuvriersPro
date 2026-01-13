// src/components/PrivateRoute.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type Role = "admin" | "worker" | "user";

interface PrivateRouteProps {
  children: React.ReactElement;
  allowedRoles?: Role[]; // ex: ['admin'] ou ['worker']
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const location = useLocation();

  // ✅ Stabilise la dépendance (évite boucle infinie car allowedRoles est recréé à chaque render)
  const allowedRolesKey = useMemo(() => {
    return (allowedRoles && allowedRoles.length > 0 ? allowedRoles : []).slice().sort().join("|");
  }, [allowedRoles]);

  const checkAuth = async () => {
    setLoading(true);

    // 1) Utilisateur connecté ?
    const { data, error } = await supabase.auth.getUser();
    const user = data?.user;

    if (error || !user) {
      setIsAllowed(false);
      setLoading(false);
      return;
    }

    // 2) Si aucun rôle exigé, on laisse passer
    if (!allowedRoles || allowedRoles.length === 0) {
      setIsAllowed(true);
      setLoading(false);
      return;
    }

    // 3) Récupérer le rôle dans op_users (fallback user si manquant)
    const { data: profile, error: profileError } = await supabase
      .from("op_users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    // Si pas de profil / rôle -> fallback "user" (évite blocage si op_users pas encore seed)
    const role = ((profile?.role as Role) || "user") as Role;

    if (profileError) {
      // On ne bloque pas par défaut sur une erreur ponctuelle : fallback "user"
      setIsAllowed(allowedRoles.includes("user") && role === "user");
      setLoading(false);
      return;
    }

    setIsAllowed(allowedRoles.includes(role));
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        await checkAuth();
      } catch (e) {
        console.error("PrivateRoute checkAuth error", e);
        if (!isMounted) return;
        setIsAllowed(false);
        setLoading(false);
      }
    };

    run();

    // ✅ Réagit aux changements de session
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (!isMounted) return;
      run();
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
    // ✅ dépendance stabilisée
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedRolesKey]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Vérification de vos droits...</div>
      </div>
    );
  }

  if (!isAllowed) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
};

export default PrivateRoute;
