import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { resolveOfflineSession } from "@/services/offlineSession";

type AuthGuardProps = {
  children: React.ReactNode;
  allowedRoles?: Array<"user" | "client" | "worker" | "admin">;
  fallbackPath?: string;
};

type GuardState = {
  loading: boolean;
  allowed: boolean;
  redirectTo: string | null;
};

export default function AuthGuard({
  children,
  allowedRoles,
  fallbackPath = "/login",
}: AuthGuardProps) {
  const location = useLocation();
  const [state, setState] = useState<GuardState>({
    loading: true,
    allowed: false,
    redirectTo: null,
  });

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const session = await resolveOfflineSession();

      if (!mounted) return;

      if (!session.isAuthenticated) {
        setState({
          loading: false,
          allowed: false,
          redirectTo: `${fallbackPath}?redirect=${encodeURIComponent(
            location.pathname + location.search
          )}`,
        });
        return;
      }

      if (allowedRoles?.length && !allowedRoles.includes(session.role)) {
        setState({
          loading: false,
          allowed: false,
          redirectTo: "/",
        });
        return;
      }

      setState({
        loading: false,
        allowed: true,
        redirectTo: null,
      });
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [allowedRoles, fallbackPath, location.pathname, location.search]);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Chargement…</div>
      </div>
    );
  }

  if (!state.allowed && state.redirectTo) {
    return <Navigate to={state.redirectTo} replace />;
  }

  return <>{children}</>;
}
