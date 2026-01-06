// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://bvezcivihjpscatsgrvu.supabase.co";
// IMPORTANT: colle ici la clé ANON (public) de Supabase (pas service_role)
const FALLBACK_ANON_KEY = ""; // <-- COLLE ICI

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_URL;

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  FALLBACK_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase] Missing env vars:", {
    hasUrl: !!supabaseUrl,
    hasAnon: !!supabaseAnonKey,
  });
  throw new Error("supabaseKey is required.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
