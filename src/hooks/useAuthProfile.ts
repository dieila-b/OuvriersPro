import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

type UserRole = "user" | "admin" | "worker";

interface OpUserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
}

async function fetchProfile(userId: string): Promise<OpUserProfile | null> {
  const { data, error } = await supabase
    .from("op_users")
    .select("id, full_name, phone, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as OpUserProfile) ?? null;
}

export function useAuthProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OpUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const applySession = async (session: Session | null) => {
      const u = session?.user ?? null;
      if (!mounted) return;

      setUser(u);

      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const p = await fetchProfile(u.id);
        if (!mounted) return;
        setProfile(p);
      } catch (e) {
        // non bloquant
        console.warn("[useAuthProfile] profile fetch error:", e);
        if (!mounted) return;
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    (async () => {
      setLoading(true);

      // ✅ getSession ne throw pas AuthSessionMissingError
      const { data } = await supabase.auth.getSession();
      await applySession(data.session ?? null);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      await applySession(session ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = profile?.role === "admin";
  const isWorker = profile?.role === "worker";
  const isClient = profile?.role === "user";

  return { user, profile, isAdmin, isWorker, isClient, loading };
}
