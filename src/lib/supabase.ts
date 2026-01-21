// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bvezcivihjpscatsgrvu.supabase.co";

// ✅ Colle ici la clé ANON PUBLIC complète (Settings → API → anon public)
const SUPABASE_ANON_KEY = `COLLE_LA_CLE_ICI_EN_ENTIER_SANS_TROUNCATURE`;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("COLLE_LA_CLE_ICI")) {
  console.error("[Supabase] Missing/placeholder config", {
    hasUrl: !!SUPABASE_URL,
    hasAnon: !!SUPABASE_ANON_KEY,
  });
  throw new Error("Supabase URL / anon key invalid.");
}

const debugFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;

  const nextInit: RequestInit = { ...init, cache: "no-store" };

  if (url.includes("/functions/v1/")) {
    console.log("[Supabase][Functions] fetch →", {
      url,
      method: nextInit?.method ?? "GET",
    });
  }

  const res = await fetch(input as any, nextInit);

  if (url.includes("/functions/v1/")) {
    console.log("[Supabase][Functions] ←", { url, status: res.status, ok: res.ok });
  }

  return res;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: debugFetch,
    headers: { "x-app": "work-find-direct" },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "op_auth",
  },
});
