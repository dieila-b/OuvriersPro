// supabase/functions/translate/index.ts
// Edge runtime types are automatically available in Supabase Edge Functions

type Payload = {
  source: "fr" | "en";
  target: "fr" | "en";
  text: string;
  tone?: "default" | "corporate" | "marketing";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function buildSystemPrompt(source: string, target: string, tone: string) {
  const toneHint =
    tone === "corporate"
      ? "Use a corporate, premium, polished tone."
      : tone === "marketing"
        ? "Use a marketing-friendly tone, persuasive but professional."
        : "Use a neutral, professional tone.";

  return [
    `You are a professional translator.`,
    `Translate from ${source.toUpperCase()} to ${target.toUpperCase()}.`,
    toneHint,
    `Keep meaning, preserve punctuation, keep brand name unchanged.`,
    `Do not add extra commentary. Return only the translated text.`,
  ].join(" ");
}

Deno.serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const payload = (await req.json()) as Partial<Payload>;
    const source = payload.source ?? "fr";
    const target = payload.target ?? "en";
    const tone = payload.tone ?? "default";
    const text = (payload.text ?? "").toString();

    if (!text.trim()) return json(400, { error: "Missing text" });
    if (source === target) return json(200, { translatedText: text });

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return json(500, {
        error:
          "OPENAI_API_KEY is not set in Supabase Edge Function secrets. Configure it to enable translation.",
      });
    }

    // OpenAI Chat Completions (simple + stable)
    const system = buildSystemPrompt(source, target, tone);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return json(502, { error: "Translation provider error", details: errText });
    }

    const data = await res.json();
    const translatedText =
      data?.choices?.[0]?.message?.content?.toString()?.trim() ?? "";

    if (!translatedText) {
      return json(502, { error: "Empty translation result" });
    }

    return json(200, { translatedText });
  } catch (e) {
    return json(500, { error: "Unexpected error", details: String((e as Error)?.message ?? e) });
  }
});
