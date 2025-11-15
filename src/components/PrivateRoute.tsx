// src/components/PrivateRoute.tsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type Role = "admin" | "worker";

interface PrivateRouteProps {
  children: React.ReactElement;
  allowedRoles?: Role[]; // ex: ['admin'] ou ['worker']
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      setLoading(true);

      // 1) Récupère l'utilisateur connecté
      const { data, error } = await supabase.auth.getUser();
      const user = data?.user;

      if (!isMounted) return;

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

      // 3) Va chercher le rôle dans op_users
      const { data: profile, error: profileError } = await supabase
        .from("op_users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (profileError || !profile) {
        setIsAllowed(false);
      } else {
        const role = profile.role as Role;
        setIsAllowed(allowedRoles.includes(role));
      }

      setLoading(false);
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          Vérification de vos droits...
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname || "/" }}
      />
    );
  }

  return children;
};

export default PrivateRoute;
