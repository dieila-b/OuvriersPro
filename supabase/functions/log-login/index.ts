// supabase/functions/log-login/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function pickHeader(h: Headers, keys: string[]) {
  for (const k of keys) {
    const v = h.get(k);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function extractIp(headers: Headers): string | null {
  const cf = pickHeader(headers, ["cf-connecting-ip"]);
  if (cf) return cf;

  const xff = pickHeader(headers, ["x-forwarded-for"]);
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const real = pickHeader(headers, ["x-real-ip"]);
  if (real) return real;

  return null;
}

// GeoIP via ipwho.is (sans clé). Timeout court pour ne jamais bloquer.
async function geoLookup(ip: string): Promise<{
  country?: string | null;
  region?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  isp?: string | null;
  timezone?: string | null;
} | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 1800);

  try {
    // IMPORTANT: ipwho.is peut renvoyer success=false si IP privée/invalid
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      headers: { "accept": "application/json" },
    });

    if (!res.ok) return null;

    const j: any = await res.json().catch(() => null);
    if (!j || j.success === false) return null;

    return {
      country: typeof j.country_code === "string" ? j.country_code : (typeof j.country === "string" ? j.country : null),
      region: typeof j.region === "string" ? j.region : null,
      city: typeof j.city === "string" ? j.city : null,
      lat: typeof j.latitude === "number" ? j.latitude : null,
      lng: typeof j.longitude === "number" ? j.longitude : null,
      isp: typeof j.isp === "string" ? j.isp : null,
      timezone: typeof j.timezone?.id === "string" ? j.timezone.id : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders() });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("authorization") ?? "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json().catch(() => ({}));

    const event = String(body?.event ?? "login");
    const success = Boolean(body?.success ?? true);
    const email = typeof body?.email === "string" ? body.email : null;
    const source = typeof body?.source === "string" ? body.source : "web";

    const userAgent =
      (typeof body?.user_agent === "string" ? body.user_agent : null) ??
      (typeof body?.meta?.user_agent === "string" ? body.meta.user_agent : null) ??
      req.headers.get("user-agent");

    const ip = extractIp(req.headers);

    // Country minimal côté CF
    const cfCountry = pickHeader(req.headers, ["cf-ipcountry"]);
    let country =
      (typeof body?.country === "string" ? body.country : null) ?? cfCountry ?? null;

    let region = (typeof body?.region === "string" ? body.region : null) ?? null;
    let city = (typeof body?.city === "string" ? body.city : null) ?? null;
    let lat = (typeof body?.lat === "number" ? body.lat : null);
    let lng = (typeof body?.lng === "number" ? body.lng : null);

    // ✅ Enrichissement GeoIP si on n'a pas ville/région/coords
    // (et si IP dispo)
    let geoExtra: any = null;
    if (ip && (!city || !region || lat == null || lng == null)) {
      geoExtra = await geoLookup(ip);
      if (geoExtra) {
        country = country ?? geoExtra.country ?? null;
        region = region ?? geoExtra.region ?? null;
        city = city ?? geoExtra.city ?? null;
        lat = (lat ?? geoExtra.lat ?? null) as any;
        lng = (lng ?? geoExtra.lng ?? null) as any;
      }
    }

    const meta = (body?.meta && typeof body.meta === "object") ? body.meta : null;

    // On enrichit meta sans casser ce que tu avais
    const mergedMeta =
      meta && typeof meta === "object"
        ? { ...meta, geo: geoExtra ?? null }
        : { geo: geoExtra ?? null };

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
      p_meta: mergedMeta,
    });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error }), {
        status: 500,
        headers: { "content-type": "application/json", ...corsHeaders() },
      });
    }

    // 204 ok (non bloquant)
    return new Response(null, { status: 204, headers: corsHeaders() });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders() },
    });
  }
});
