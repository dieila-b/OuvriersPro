// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bvezcivihjpscatsgrvu.supabase.co";

// ✅ clé anon public (ok côté front)
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmz.....";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("[Supabase] Missing config", {
    hasUrl: !!SUPABASE_URL,
    hasAnon: !!SUPABASE_ANON_KEY,
  });
  throw new Error("Supabase URL / anon key missing.");
}

/**
 * ✅ Debug / anti-cache:
 * - Trace uniquement les appels Edge Functions (/functions/v1/)
 * - Force cache: "no-store" pour éviter tout comportement cache proxy/navigateur
 */
const debugFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;

  // force no-store partout (surtout utile sur Preview)
  const nextInit: RequestInit = {
    ...init,
    cache: "no-store",
  };

  // logs ciblés uniquement sur Edge Functions
  if (url.includes("/functions/v1/")) {
    // eslint-disable-next-line no-console
    console.log("[Supabase][Functions] fetch →", {
      url,
      method: nextInit?.method ?? "GET",
      hasAuthHeader: !!(nextInit.headers as any)?.Authorization || !!(nextInit.headers as any)?.authorization,
    });
  }

  const res = await fetch(input as any, nextInit);

  if (url.includes("/functions/v1/")) {
    // eslint-disable-next-line no-console
    console.log("[Supabase][Functions] ←", {
      url,
      status: res.status,
      ok: res.ok,
    });
  }

  return res;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: debugFetch,
    headers: {
      // utile en debug / traçage côté Edge Function
      "x-app": "work-find-direct",
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "op_auth",
  },
});
