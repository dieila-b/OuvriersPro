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

  const loadProfile = async (u: User | null) => {
    if (!u) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("op_users")
      .select("id, full_name, phone, role")
      .eq("id", u.id)
      .maybeSingle();

    if (error) {
      console.error("load profile error", error);
      setProfile(null);
      return;
    }

    setProfile((data as OpUserProfile) ?? null);
  };

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      setLoading(true);

      try {
        // ✅ Plus fiable pour initialiser (évite certains cas où getUser ne suffit pas)
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;

        const u = sessionData.session?.user ?? null;

        if (cancelled) return;
        setUser(u);

        await loadProfile(u);
      } catch (e) {
        console.error("auth boot error", e);
        if (cancelled) return;
        setUser(null);
        setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    boot();

    // ✅ Écoute des changements de session
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sUser = session?.user ?? null;

      // Important: on ne remet pas loading=true ici (sinon flicker permanent)
      if (cancelled) return;

      setUser(sUser);

      try {
        await loadProfile(sUser);
      } catch (e) {
        console.error("auth state loadProfile error", e);
        if (!cancelled) setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const isAdmin = !!profile && profile.role === "admin";
  const isWorker = !!profile && profile.role === "worker";
  const isClient = !!profile && profile.role === "user";

  return { user, profile, isAdmin, isWorker, isClient, loading };
}
