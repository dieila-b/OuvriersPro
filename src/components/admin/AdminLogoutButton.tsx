// src/components/admin/AdminLogoutButton.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";

type Props = {
  className?: string;
  redirectTo?: string; // default "/"
};

export default function AdminLogoutButton({ className, redirectTo = "/" }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate(redirectTo, { replace: true });
    } catch (e) {
      console.error("AdminLogoutButton signOut error", e);
      // On redirige quand même pour éviter un admin “bloqué”
      navigate(redirectTo, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={logout}
      disabled={loading}
      className={className}
      title="Déconnexion"
    >
      <LogOut className="w-4 h-4 mr-2" />
      {loading ? "Déconnexion..." : "Déconnexion"}
    </Button>
  );
}
