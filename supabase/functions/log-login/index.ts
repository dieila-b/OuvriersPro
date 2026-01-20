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
  // Supabase Hosting (Cloudflare) / parfois d'autres proxies
  const direct =
    pickHeader(headers, [
      "cf-connecting-ip",
      "true-client-ip",
      "x-real-ip",
      "x-client-ip",
    ]) ?? null;

  if (direct) return direct;

  const xff = pickHeader(headers, ["x-forwarded-for"]);
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  return null;
}

function corsHeaders(origin: string | null) {
  // Si tu veux être strict, remplace "*" par ton domaine.
  // Ici on accepte large pour débloquer.
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-credentials": "true",
    "access-control-allow-headers":
      "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "origin",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: cors });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(
        JSON.stringify({
          ok: false,
          message:
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets.",
        }),
        { status: 500, headers: { ...cors, "content-type": "application/json" } }
      );
    }

    // ✅ Client admin (écriture fiable, pas dépendante du token user)
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));

    const event = typeof body?.event === "string" ? body.event : "login";
    const success =
      typeof body?.success === "boolean" ? body.success : Boolean(body?.success ?? true);
    const email = typeof body?.email === "string" ? body.email : null;
    const source = typeof body?.source === "string" ? body.source : "web";

    // UA
    const userAgent =
      (typeof body?.user_agent === "string" ? body.user_agent : null) ??
      (typeof body?.meta?.user_agent === "string" ? body.meta.user_agent : null) ??
      req.headers.get("user-agent") ??
      null;

    // IP + pays depuis Cloudflare headers (Supabase Hosting)
    const ip = extractIp(req.headers);

    const country =
      (typeof body?.country === "string" ? body.country : null) ??
      pickHeader(req.headers, ["cf-ipcountry"]);

    // Région / ville : Cloudflare ne les fournit pas par défaut sur Supabase Hosting
    // On garde la possibilité si un jour tu les ajoutes via une autre source.
    const region = typeof body?.region === "string" ? body.region : null;
    const city = typeof body?.city === "string" ? body.city : null;

    const lat = typeof body?.lat === "number" ? body.lat : null;
    const lng = typeof body?.lng === "number" ? body.lng : null;

    const meta = body?.meta && typeof body.meta === "object" ? body.meta : null;

    // ✅ Appel RPC (ta signature confirmée)
    const { data: id, error } = await supabaseAdmin.rpc("op_log_login_event", {
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
      return new Response(JSON.stringify({ ok: false, error }), {
        status: 500,
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    // ✅ Réponse JSON utile pour debug réseau
    return new Response(
      JSON.stringify({
        ok: true,
        id,
        stored: { event, success, email, source, ip, country, region, city },
      }),
      { status: 200, headers: { ...cors, "content-type": "application/json" } }
    );
  } catch (e) {
    console.error("[log-login] fatal:", e);
    return new Response(JSON.stringify({ ok: false, message: String(e) }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});
