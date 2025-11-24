import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type UserRole = "user" | "admin" | "worker";

interface OpUserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
}

export function useAuthProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OpUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Chargement initial
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("auth.getUser error", error);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const currentUser = data.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: rows, error: profileError } = await supabase
          .from("op_users")
          .select("id, full_name, phone, role")
          .eq("id", currentUser.id)
          .limit(1);

        if (profileError) {
          console.error("load profile error", profileError);
          setProfile(null);
        } else {
          setProfile(rows?.[0] ?? null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    };

    load();

    // Écoute des changements de session
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sUser = session?.user ?? null;
        setUser(sUser);

        if (!sUser) {
          setProfile(null);
          return;
        }

        (async () => {
          const { data: rows } = await supabase
            .from("op_users")
            .select("id, full_name, phone, role")
            .eq("id", sUser.id)
            .limit(1);

          setProfile(rows?.[0] ?? null);
        })();
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = !!profile && profile.role === "admin";

  return { user, profile, isAdmin, loading };
}
