// src/hooks/useAuthProfile.ts
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

  // ✅ Pas de throw dur: on log et on retourne null
  // (en mobile/webview, on préfère que l'app reste navigable)
  if (error) {
    // Si la ligne n'existe pas encore, Supabase renvoie data=null sans erreur.
    // Ici error = vrai souci (RLS, réseau, etc.)
    console.warn("[useAuthProfile] fetchProfile error:", error);
    return null;
  }

  return (data as OpUserProfile) ?? null;
}

export function useAuthProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OpUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // évite les courses (plusieurs calls qui reviennent dans le désordre)
  const seqRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const safeSet = <T,>(setter: (v: T) => void, value: T) => {
      if (mountedRef.current) setter(value);
    };

    const applySession = async (session: Session | null) => {
      const seq = ++seqRef.current;
      const u = session?.user ?? null;

      // ✅ Toujours synchroniser l'état auth d'abord
      safeSet(setUser, u);

      // ✅ Pas connecté => état normal (pas une erreur)
      if (!u) {
        if (!mountedRef.current || seq !== seqRef.current) return;
        safeSet(setProfile, null);
        safeSet(setLoading, false);
        return;
      }

      // ✅ Connecté => charge le profil (non bloquant)
      const p = await fetchProfile(u.id);

      if (!mountedRef.current || seq !== seqRef.current) return;
      safeSet(setProfile, p);
      safeSet(setLoading, false);
    };

    const bootstrap = async () => {
      safeSet(setLoading, true);

      // ✅ getSession est la méthode la plus stable (évite AuthSessionMissingError)
      const { data, error } = await supabase.auth.getSession();

      if (!mountedRef.current) return;

      if (error) {
        console.warn("[useAuthProfile] getSession error:", error);
        safeSet(setUser, null);
        safeSet(setProfile, null);
        safeSet(setLoading, false);
        return;
      }

      await applySession(data.session ?? null);
    };

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // ✅ on bascule loading sans bloquer et on applique
      if (mountedRef.current) setLoading(true);
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
