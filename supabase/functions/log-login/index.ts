// supabase/functions/log-login/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** CORS helpers */
function corsHeaders(origin: string | null) {
  // Si tu veux restreindre, remplace "*" par ton domaine, ou fais une allowlist.
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-headers":
      "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    "vary": "origin",
  };
}

function pickHeader(h: Headers, keys: string[]) {
  for (const k of keys) {
    const v = h.get(k);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function extractIp(headers: Headers): string | null {
  // Cloudflare / Supabase hosting
  const cf = pickHeader(headers, ["cf-connecting-ip"]);
  if (cf) return cf;

  // Standard proxy chain
  const xff = pickHeader(headers, ["x-forwarded-for"]);
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const real = pickHeader(headers, ["x-real-ip"]);
  if (real) return real;

  return null;
}

function safeString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function safeNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function geoLookup(ip: string): Promise<{
  country?: string | null;
  region?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
} | null> {
  // Non bloquant : si l’appel échoue, on retourne null.
  // ipwho.is est pratique (pas besoin de clé) mais ce n’est pas “garanti” à 100%.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 1500);

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: ctrl.signal,
      headers: { "accept": "application/json" },
    });
    if (!res.ok) return null;

    const j: any = await res.json().catch(() => null);
    if (!j || j.success === false) return null;

    return {
      country: safeString(j.country_code) ?? safeString(j.country),
      region: safeString(j.region),
      city: safeString(j.city),
      lat: safeNumber(j.latitude),
      lng: safeNumber(j.longitude),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders(origin),
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL) {
      return new Response(
        JSON.stringify({ ok: false, message: "Missing SUPABASE_URL" }),
        { status: 500, headers: { "content-type": "application/json", ...corsHeaders(origin) } }
      );
    }

    // ✅ IMPORTANT: journalisation fiable => service role
    const apiKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ ok: false, message: "Missing SUPABASE_SERVICE_ROLE_KEY (or ANON)" }),
        { status: 500, headers: { "content-type": "application/json", ...corsHeaders(origin) } }
      );
    }

    // On ne dépend PAS de l'Authorization client pour écrire (sinon RLS casse).
    // (Tu peux quand même le lire si tu veux tracer, mais pas nécessaire.)
    const supabase = createClient(SUPABASE_URL, apiKey);

    const body = await req.json().catch(() => ({}));

    // Champs attendus de ton front
    const event = safeString(body?.event) ?? "login";
    const success = typeof body?.success === "boolean" ? body.success : true;
    const email = safeString(body?.email);
    const source = safeString(body?.source) ?? "web";

    // user_agent : meta.user_agent prioritaire (c’est ce que ton App.tsx envoie)
    const userAgent =
      safeString(body?.user_agent) ??
      safeString(body?.meta?.user_agent) ??
      safeString(body?.meta?.ua) ??
      safeString(req.headers.get("user-agent"));

    // IP + pays via Cloudflare headers (Supabase hosting)
    const ip = extractIp(req.headers);

    // Pays minimal via Cloudflare (ISO2)
    let country =
      safeString(body?.country) ??
      pickHeader(req.headers, ["cf-ipcountry"]);

    let region = safeString(body?.region);
    let city = safeString(body?.city);
    let lat = safeNumber(body?.lat);
    let lng = safeNumber(body?.lng);

    // ✅ Si pas de ville/région, on tente une géoloc serveur (non bloquante)
    // (utile si Cloudflare ne fournit pas region/city)
    if (ip && (!region || !city || lat === null || lng === null)) {
      const g = await geoLookup(ip);
      if (g) {
        country = country ?? (g.country ?? null);
        region = region ?? (g.region ?? null);
        city = city ?? (g.city ?? null);
        lat = lat ?? (g.lat ?? null);
        lng = lng ?? (g.lng ?? null);
      }
    }

    const meta =
      body?.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
        ? body.meta
        : null;

    // DEBUG utile dans Supabase Logs (Edge Function logs)
    console.log("[log-login] payload:", {
      event,
      success,
      email,
      source,
      ip,
      country,
      region,
      city,
      hasMeta: !!meta,
    });

    // Appel de ta fonction SQL existante
    const { error } = await supabase.rpc("op_log_login_event", {
      p_event: event,
      p_success: success,
      p_email: email,
      p_ip: ip,
      p_user_agent: userAgent,
      p_country: country,
      p_region: region,
      p_city: city,
      p_lat: lat,
      p_lng: lng,
      p_source: source,
      p_meta: meta,
    });

    if (error) {
      console.error("[log-login] rpc error:", error);
      return new Response(
        JSON.stringify({ ok: false, message: "rpc op_log_login_event failed", error }),
        { status: 500, headers: { "content-type": "application/json", ...corsHeaders(origin) } }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json", ...corsHeaders(origin) },
    });
  } catch (e) {
    console.error("[log-login] fatal:", e);
    return new Response(
      JSON.stringify({ ok: false, message: String(e) }),
      { status: 500, headers: { "content-type": "application/json", ...corsHeaders(origin) } }
    );
  }
});
