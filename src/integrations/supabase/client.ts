// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

const url =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL;

const anon =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Log explicite (comme tu vois dans ta console)
  // et crash volontaire : sans ça, l'app part en erreurs silencieuses partout
  // et le debug devient impossible.
  // eslint-disable-next-line no-console
  console.error("[Supabase] Missing env vars:", { hasUrl: !!url, hasAnon: !!anon });
  throw new Error("supabaseKey is required.");
}

export const supabase = createClient(url, anon, {
  auth:e: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
