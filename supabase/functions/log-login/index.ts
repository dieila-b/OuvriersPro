// supabase/functions/log-login/index.ts
/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Payload = {
  event?: "login" | "logout" | "refresh" | string;
  success?: boolean;
  user_id?: string | null;
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
  // x-forwarded-for: "client, proxy1, proxy2"
  const first = xff.split(",")[0]?.trim();
  return first || null;
}

function normalizeIp(ip: string | null) {
  if (!ip) return null;
  // supprime port si présent: "1.2.3.4:1234"
  const v = ip.includes(":") && ip.includes(".") ? ip.split(":")[0] : ip;
  return v?.trim() || null;
}

function getIp(req: Request) {
  // Priorité: x-forwarded-for -> x-real-ip -> cf-connecting-ip -> fly-client-ip
  const xff = firstHeader(req, ["x-forwarded-for"]);
  const xri = firstHeader(req, ["x-real-ip"]);
  const ccip = firstHeader(req, ["cf-connecting-ip"]);
  const fly = firstHeader(req, ["fly-client-ip"]);

  const fromXff = parseForwardedFor(xff);
  return normalizeIp(fromXff || xri || ccip || fly);
}

function getGeo(req: Request) {
  // Sur certains fronts/CDN, tu peux recevoir des infos géo:
  // - Cloudflare: cf-ipcountry
  // - Vercel: x-vercel-ip-country, x-vercel-ip-city, x-vercel-ip-country-region
  // - autres: x-geo-country, x-geo-city, x-geo-region (custom)
  const country =
    firstHeader(req, ["cf-ipcountry", "x-vercel-ip-country", "x-geo-country", "x-country"]) ?? null;

  const region =
    firstHeader(req, ["x-vercel-ip-country-region", "x-geo-region", "x-region", "x-state"]) ?? null;

  const city =
    firstHeader(req, ["x-vercel-ip-city", "x-geo-city", "x-city"]) ?? null;

  // coord éventuelles (rare)
  const lat =
    firstHeader(req, ["x-geo-lat", "x-latitude", "x-lat"]) ?? null;
  const lng =
    firstHeader(req, ["x-geo-lng", "x-longitude", "x-lng"]) ?? null;

  return {
    country: country && country !== "XX" ? country : null,
    region,
    city,
    lat: lat ? Number(lat) : null,
    lng: lng ? Number(lng) : null,
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

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client "user" (pour valider le JWT de l'appelant)
    const authHeader = req.headers.get("authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData } = await userClient.auth.getUser();
    const authedUser = authData?.user ?? null;

    const body = (await req.json().catch(() => ({}))) as Payload;

    // Sécurité: on force user_id/email depuis le token si dispo
    const safeUserId = authedUser?.id ?? body.user_id ?? null;
    const safeEmail = authedUser?.email ?? body.email ?? null;

    // IP + Geo depuis headers proxy
    const ip = getIp(req);
    const geo = getGeo(req);

    const userAgent = firstHeader(req, ["user-agent"]) ?? null;

    // Meta enrichi
    const meta = {
      ...(typeof body.meta === "object" && body.meta ? body.meta : {}),
      // On stocke aussi les headers utiles pour debug (sans tout dump)
      _headers: {
        "x-forwarded-for": firstHeader(req, ["x-forwarded-for"]),
        "x-real-ip": firstHeader(req, ["x-real-ip"]),
        "cf-ipcountry": firstHeader(req, ["cf-ipcountry"]),
      },
    };

    // Écriture DB via Service Role (bypass RLS)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Ta fonction SQL existe: public.op_log_login_event
    const { error: rpcError } = await adminClient.rpc("op_log_login_event", {
      p_event: body.event ?? "unknown",
      p_success: typeof body.success === "boolean" ? body.success : true,
      p_user_id: safeUserId,
      p_email: safeEmail,
      p_ip: ip,
      p_country: geo.country,
      p_region: geo.region,
      p_city: geo.city,
      p_lat: geo.lat,
      p_lng: geo.lng,
      p_source: body.source ?? "web",
      p_user_agent: userAgent,
      p_meta: meta,
    });

    if (rpcError) {
      // Fallback: insert direct (si tu as la table + colonnes)
      // IMPORTANT: si ça échoue, on renvoie l'erreur RPC
      return json({ ok: false, error: rpcError.message }, 500);
    }

    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
      },
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? "Unexpected error" }, 500);
  }
});
