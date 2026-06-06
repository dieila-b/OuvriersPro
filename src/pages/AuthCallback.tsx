// src/pages/AuthCallback.tsx
// Page de callback OAuth — utilisée après redirection Google/Facebook sur le web
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { handleOAuthCallback } from "@/lib/socialAuth";
import { localStore } from "@/services/localStore";

const LOCAL_ROLE_KEY = "local_auth_role";

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { role, error } = await handleOAuthCallback();

      if (error || !role) {
        console.error("[AuthCallback] error:", error);
        navigate("/login", { replace: true });
        return;
      }

      await localStore.set(LOCAL_ROLE_KEY, role);

      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "worker") navigate("/espace-ouvrier", { replace: true });
      else navigate("/espace-client", { replace: true });
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-sm text-slate-500 animate-pulse">Connexion en cours…</div>
    </div>
  );
};

export default AuthCallback;
