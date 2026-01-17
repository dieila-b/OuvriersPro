import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getIp(req: Request) {
  // Selon proxy/CDN : x-forwarded-for peut contenir une liste
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") || // Cloudflare
    null
  );
}

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const {
      user_id = null,
      email = null,
      event = "login",
      success = true,
      user_agent = req.headers.get("user-agent") ?? null,
      source = "web",
      meta = {},
      // Optionnel: si tu veux pousser une localisation côté front quand elle est autorisée
      geo = null, // { country, region, city, latitude, longitude }
    } = body ?? {};

    const ip = getIp(req);

    const payload: any = {
      user_id,
      email,
      event,
      success,
      ip,
      user_agent,
      source,
      meta,
    };

    // Geo optionnelle (si tu la fournis)
    if (geo && typeof geo === "object") {
      payload.country = geo.country ?? null;
      payload.region = geo.region ?? null;
      payload.city = geo.city ?? null;
      payload.latitude = geo.latitude ?? null;
      payload.longitude = geo.longitude ?? null;
    }

    const { error } = await supabase.from("op_login_audit").insert(payload);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { "content-type": "application/json" },
      status: 500,
    });
  }
});
