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

  // ✅ clé stable pour éviter que l'effet relance en boucle
  const rolesKey = useMemo(() => (allowedRoles?.length ? allowedRoles.join("|") : "any"), [allowedRoles]);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      if (!isMounted) return;
      setLoading(true);

      try {
        // 1) Récupère la session (plus fiable que getUser pour certains cas)
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        const user = sessionData.session?.user ?? null;

        if (!isMounted) return;

        if (sessionErr || !user) {
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

        // 3) Va chercher le rôle dans op_users
        const { data: profile, error: profileError } = await supabase
          .from("op_users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (profileError || !profile) {
          // si RLS bloque op_users, tu seras refusé (et redirigé login)
          setIsAllowed(false);
          setLoading(false);
          return;
        }

        const role = profile.role as Role;
        setIsAllowed(allowedRoles.includes(role));
        setLoading(false);
      } catch (e) {
        console.error("PrivateRoute checkAuth error:", e);
        if (!isMounted) return;
        setIsAllowed(false);
        setLoading(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
    // ✅ dépendance stable
  }, [rolesKey]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Vérification de vos droits...</div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname || "/")}`}
        replace
        state={{ from: location.pathname || "/" }}
      />
    );
  }

  return children;
};

export default PrivateRoute;
