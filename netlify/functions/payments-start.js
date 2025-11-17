// netlify/functions/payments-start.js
const { createClient } = require("@supabase/supabase-js");

// CORS basique (si ton front est sur le même domaine Netlify, ça ira)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appBaseUrl = process.env.APP_BASE_URL || "https://ouvrierspro.netlify.app";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Cette fonction gère uniquement :
 * - le paiement Mobile Money / Manuel
 * - la création d'une ligne dans op_payments avec statut "pending"
 * - le renvoi d'une redirectUrl pour ton front
 */
exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const {
      planCode,        // "FREE" | "MONTHLY" | "YEARLY"
      paymentMethod,   // "mobile_money" | "manual"
      amount,          // 5000, 50000, etc.
      currency,        // "GNF"
      userId,          // optionnel pour l'instant
      email,           // optionnel pour suivi
    } = body;

    if (!planCode || !paymentMethod || !amount || !currency) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Missing required fields (planCode, paymentMethod, amount, currency)",
        }),
      };
    }

    // 🔑 Générer une référence de paiement
    const ref = `MM-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

    // 💾 Créer une ligne dans op_payments
    const { error: insertError } = await supabase.from("op_payments").insert({
      user_id: userId || null,       // on pourra remplir plus tard si besoin
      email: email || null,
      plan_code: planCode,           // FREE / MONTHLY / YEARLY
      amount: amount,                // 5000 / 50000
      currency: currency,            // GNF
      method: paymentMethod,         // mobile_money, manual, ...
      status: "pending",             // en attente de validation
      reference: ref,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Erreur insert op_payments:", insertError);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Failed to create payment record",
          details: insertError.message,
        }),
      };
    }

    // 🌍 URL de retour vers ton front (TU pourras la modifier)
    // Pour l’instant on renvoie la page d’inscription avec payment_status=pending
    const redirectUrl = `${appBaseUrl}/inscription-ouvrier?plan=${encodeURIComponent(
      planCode
    )}&payment_status=pending&payment_ref=${encodeURIComponent(ref)}`;

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        redirectUrl,
        reference: ref,
        status: "pending",
      }),
    };
  } catch (err) {
    console.error("Unexpected error in payments-start:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Unexpected error",
        details: err.message,
      }),
    };
  }
};
