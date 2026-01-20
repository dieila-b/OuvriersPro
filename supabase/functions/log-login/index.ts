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
  // Cloudflare / Supabase hosting
  const cf = pickHeader(headers, ["cf-connecting-ip"]);
  if (cf) return cf;

  // Standard proxy chain
  const xff = pickHeader(headers, ["x-forwarded-for"]);
  if (xff) {
    // "client, proxy1, proxy2"
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const real = pickHeader(headers, ["x-real-ip"]);
  if (real) return real;

  return null;
}

serve(async (req) => {
  // CORS simple (si ton front et la function sont sur le même projet, ça suffit)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
        "access-control-allow-methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // IMPORTANT: on garde l'Authorization du client pour que auth.uid() fonctionne côté SQL
    const authHeader = req.headers.get("authorization") ?? "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json().catch(() => ({}));

    // Champs attendus de ton front
    const event = String(body?.event ?? "login");
    const success = Boolean(body?.success ?? true);
    const email = typeof body?.email === "string" ? body.email : null;
    const source = typeof body?.source === "string" ? body.source : "web";

    // user_agent : prioritaire depuis le navigateur, sinon depuis le header
    const userAgent =
      (typeof body?.user_agent === "string" ? body.user_agent : null) ??
      (typeof body?.meta?.user_agent === "string" ? body.meta.user_agent : null) ??
      req.headers.get("user-agent");

    // IP + GEO depuis CDN (Supabase Hosting = Cloudflare)
    const ip = extractIp(req.headers);

    // Cloudflare donne au minimum le pays (code ISO2) via cf-ipcountry
    // Région / Ville ne sont pas garanties par défaut -> souvent null.
    const country =
      (typeof body?.country === "string" ? body.country : null) ??
      pickHeader(req.headers, ["cf-ipcountry"]);

    const region =
      (typeof body?.region === "string" ? body.region : null) ??
      null;

    const city =
      (typeof body?.city === "string" ? body.city : null) ??
      null;

    const lat = (typeof body?.lat === "number" ? body.lat : null);
    const lng = (typeof body?.lng === "number" ? body.lng : null);

    const meta = (body?.meta && typeof body.meta === "object") ? body.meta : null;

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
      return new Response(JSON.stringify({ ok: false, error }), {
        status: 500,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      });
    }

    return new Response(null, {
      status: 204,
      headers: { "access-control-allow-origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }
});
