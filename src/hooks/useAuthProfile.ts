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

  if (error) throw error;
  return (data as OpUserProfile) ?? null;
}

export function useAuthProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OpUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // évite les courses (plusieurs calls qui reviennent dans le désordre)
  const seqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const applySession = async (session: Session | null) => {
      const seq = ++seqRef.current;

      const u = session?.user ?? null;

      // Toujours synchroniser l'état auth d'abord
      if (mountedRef.current) {
        setUser(u);
      }

      // Pas connecté => pas une erreur
      if (!u) {
        if (mountedRef.current && seq === seqRef.current) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      try {
        const p = await fetchProfile(u.id);
        if (!mountedRef.current || seq !== seqRef.current) return;
        setProfile(p);
      } catch (e) {
        // Non bloquant: profile peut ne pas exister (ou erreur réseau)
        console.warn("[useAuthProfile] profile fetch error:", e);
        if (!mountedRef.current || seq !== seqRef.current) return;
        setProfile(null);
      } finally {
        if (mountedRef.current && seq === seqRef.current) {
          setLoading(false);
        }
      }
    };

    const bootstrap = async () => {
      setLoading(true);

      // ✅ getSession: ne renvoie pas AuthSessionMissingError
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.warn("[useAuthProfile] getSession error:", error);
        // on reste safe: utilisateur anonyme
        if (mountedRef.current) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      await applySession(data.session ?? null);
    };

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Important: remettre loading true, mais sans casser le thread UI
      setLoading(true);
      await applySession(session ?? null);
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
