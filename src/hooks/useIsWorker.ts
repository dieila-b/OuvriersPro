// src/hooks/useIsWorker.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useIsWorker() {
  const [loading, setLoading] = useState(true);
  const [isWorker, setIsWorker] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (!mounted) return;

        if (!user) {
          setIsWorker(false);
          setLoading(false);
          return;
        }

        // ✅ S'il existe un profil dans op_ouvriers => c'est un ouvrier
        const { data: row, error } = await supabase
          .from("op_ouvriers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.warn("useIsWorker error:", error);
          setIsWorker(false);
        } else {
          setIsWorker(!!row);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();

    const { data: sub } = supabase.auth.onAuthStateChange(() => run());

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return { loading, isWorker };
}
