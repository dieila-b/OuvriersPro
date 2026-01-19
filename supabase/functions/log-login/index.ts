// supabase/functions/log-login/index.ts
/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Payload = {
  event?: "login" | "logout" | "refresh" | string;
  success?: boolean;
  email?: string | null;
  source?: string | null;
  meta?: any;
};

function firstHeader(req: Request, names: string[]) {
  for (const n of names) {
    const v = req.headers.get(n);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function parseForwardedFor(xff: string | null) {
  if (!xff) return null;
  return xff.split(",")[0]?.trim() || null;
}

function normalizeIp(ip: string | null) {
  if (!ip) return null;
  // "1.2.3.4:1234" => "1.2.3.4"
  if (ip.includes(".") && ip.includes(":")) return ip.split(":")[0]?.trim() || null;
  return ip.trim() || null;
}

function getIp(req: Request) {
  const xff = firstHeader(req, ["x-forwarded-for"]);
  const xri = firstHeader(req, ["x-real-ip"]);
  const ccip = firstHeader(req, ["cf-connecting-ip"]);
  const fly = firstHeader(req, ["fly-client-ip"]);
  const trueClient = firstHeader(req, ["true-client-ip"]);

  const fromXff = parseForwardedFor(xff);
  return normalizeIp(fromXff || xri || ccip || fly || trueClient);
}

function getGeo(req: Request) {
  // Selon ton infra, ces headers peuvent être vides.
  // Pays parfois dispo (Cloudflare / proxy), ville/région rarement sans service GeoIP.
  const country =
    firstHeader(req, ["cf-ipcountry", "x-vercel-ip-country", "x-geo-country", "x-country"]) ?? null;

  const region =
    firstHeader(req, ["x-vercel-ip-country-region", "x-geo-region", "x-region", "x-state"]) ?? null;

  const city = firstHeader(req, ["x-vercel-ip-city", "x-geo-city", "x-city"]) ?? null;

  return {
    country: country && country !== "XX" ? country : null,
    region,
    city,
  };
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "authorization, content-type",
      },
    });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = (await req.json().catch(() => ({}))) as Payload;

    // Si le JWT est présent, on récupère l'utilisateur
    const { data: authData } = await userClient.auth.getUser().catch(() => ({ data: null as any }));
    const authedUser = authData?.user ?? null;

    const ip = getIp(req);
    const geo = getGeo(req);
    const userAgent = firstHeader(req, ["user-agent"]) ?? null;

    const safeEmail = authedUser?.email ?? body.email ?? null;

    // ✅ IMPORTANT: ta fonction SQL n’a PAS p_user_id,
    // donc on stocke user_id dans meta pour quand même l’avoir côté admin.
    const meta = {
      ...(typeof body.meta === "object" && body.meta ? body.meta : {}),
      note: body.meta?.note ?? "client-side",
      user_id: authedUser?.id ?? null,
      // Debug utile si besoin (tu peux supprimer plus tard)
      _headers: {
        "x-forwarded-for": firstHeader(req, ["x-forwarded-for"]),
        "x-real-ip": firstHeader(req, ["x-real-ip"]),
        "cf-connecting-ip": firstHeader(req, ["cf-connecting-ip"]),
        "cf-ipcountry": firstHeader(req, ["cf-ipcountry"]),
      },
    };

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: rpcError } = await adminClient.rpc("op_log_login_event", {
      p_event: body.event ?? "unknown",
      p_success: typeof body.success === "boolean" ? body.success : true,
      p_email: safeEmail,
      p_ip: ip,
      p_user_agent: userAgent,
      p_country: geo.country,
      p_region: geo.region,
      p_city: geo.city,
      p_lat: null,
      p_lng: null,
      p_source: body.source ?? "web",
      p_meta: meta,
    });

    if (rpcError) return json({ ok: false, error: rpcError.message }, 500);

    return new Response(null, {
      status: 204,
      headers: { "access-control-allow-origin": "*" },
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? "Unexpected error" }, 500);
  }
});
