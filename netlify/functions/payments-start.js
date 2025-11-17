// netlify/functions/payments-start.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appBaseUrl =
  process.env.APP_BASE_URL || "https://ouvrierspro.netlify.app";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

function getAmountForPlan(planCode) {
  if (planCode === "MONTHLY") return 5000;
  if (planCode === "YEARLY") return 50000;
  return 0;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { planCode, paymentMethod, workerEmail } = body;

    if (!planCode || !paymentMethod || !workerEmail) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error:
            "Missing required fields: planCode, paymentMethod, workerEmail",
        }),
      };
    }

    const amount = getAmountForPlan(planCode);

    const { data, error } = await supabaseAdmin
      .from("op_payments")
      .insert({
        worker_email: workerEmail,
        plan_code: planCode,
        amount,
        currency: "GNF",
        method: paymentMethod, // "mobile_money" / "manual"
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw error;

    const paymentRef = data.id;

    const redirectUrl = `${appBaseUrl}/inscription-ouvrier?plan=${encodeURIComponent(
      planCode
    )}&payment_status=success&payment_ref=${encodeURIComponent(paymentRef)}`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirectUrl, paymentRef }),
    };
  } catch (err) {
    console.error("payments-start error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Payment initialization failed",
        details: err.message || String(err),
      }),
    };
  }
};
