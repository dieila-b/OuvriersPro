import { useEffect, useMemo, useRef, useState } from "react";
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

  // ✅ Non bloquant : garde l'app utilisable même si RLS/réseau
  if (error) {
    console.warn("[useAuthProfile] fetchProfile error:", error);
    return null;
  }

  return (data as OpUserProfile) ?? null;
}

export function useAuthProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OpUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const seqRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const safe = (fn: () => void) => {
      if (mountedRef.current) fn();
    };

    const applySession = async (session: Session | null) => {
      const seq = ++seqRef.current;
      const u = session?.user ?? null;

      safe(() => setUser(u));

      // ✅ pas connecté => état normal
      if (!u) {
        if (!mountedRef.current || seq !== seqRef.current) return;
        safe(() => {
          setProfile(null);
          setLoading(false);
        });
        return;
      }

      const p = await fetchProfile(u.id);
      if (!mountedRef.current || seq !== seqRef.current) return;

      safe(() => {
        setProfile(p);
        setLoading(false);
      });
    };

    const bootstrap = async () => {
      safe(() => setLoading(true));

      // ✅ Stable partout (web + android webview)
      const { data, error } = await supabase.auth.getSession();

      if (!mountedRef.current) return;

      if (error) {
        console.warn("[useAuthProfile] getSession error:", error);
        safe(() => {
          setUser(null);
          setProfile(null);
          setLoading(false);
        });
        return;
      }

      await applySession(data.session ?? null);
    };

    void bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      safe(() => setLoading(true));
      void applySession(session ?? null);
    });

    return () => {
      mountedRef.current = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const flags = useMemo(() => {
    const role = profile?.role;
    return {
      isAdmin: role === "admin",
      isWorker: role === "worker",
      isClient: role === "user",
    };
  }, [profile?.role]);

  return { user, profile, ...flags, loading };
}
