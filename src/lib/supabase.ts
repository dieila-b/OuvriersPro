// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_PUBLIC_SUPABASE_URL ||
  "";

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Important: évite un "silence" qui te fait croire que la DB est vide
  // (sur Netlify, c’est fréquent si les env vars ne sont pas posées)
  // eslint-disable-next-line no-console
  console.error("[Supabase] Missing env vars:", {
    hasUrl: Boolean(SUPABASE_URL),
    hasAnon: Boolean(SUPABASE_ANON_KEY),
  });
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
