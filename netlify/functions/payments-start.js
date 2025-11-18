// netlify/functions/payments-start.js

// Petit helper CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  // Préflight CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  // On n'accepte que POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    console.error("Invalid JSON body:", e);
    return {
      statusCode: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { plan, paymentMethod, email, successUrl, cancelUrl } = body;

  // Vérification basique des champs attendus
  if (!plan || !paymentMethod || !email || !successUrl || !cancelUrl) {
    console.error("Missing required fields:", {
      plan,
      paymentMethod,
      email,
      successUrl,
      cancelUrl,
    });
    return {
      statusCode: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error:
          "Missing required fields (plan, paymentMethod, email, successUrl, cancelUrl)",
      }),
    };
  }

  // Ici, plus tard : appel réel à Stripe / PayPal / Mobile Money.
  // Pour l’instant, on SIMULE un paiement réussi.

  const paymentRef = `MM-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  // successUrl vient du front sous la forme :
  //   /inscription-ouvrier?plan=...&payment_status=success&payment_ref={REF}
  // On remplace {REF} par la vraie référence.
  const redirectUrl = successUrl.replace("{REF}", encodeURIComponent(paymentRef));

  console.log("Payment simulation ok:", {
    plan,
    paymentMethod,
    email,
    paymentRef,
    redirectUrl,
  });

  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      redirectUrl,
      paymentRef,
    }),
  };
};
