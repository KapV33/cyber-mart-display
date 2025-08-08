// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nowpayments-sig",
};

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(sig);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const NOWPAYMENTS_IPN_SECRET = Deno.env.get("NOWPAYMENTS_IPN_SECRET");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !NOWPAYMENTS_IPN_SECRET) {
    return new Response("Missing server configuration", { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const raw = await req.text();
    const payload = JSON.parse(raw || "{}");
    const sigHeader = req.headers.get("x-nowpayments-sig") || "";

    // Verify signature
    const computed = await hmacHex(NOWPAYMENTS_IPN_SECRET, raw);
    if (computed.toLowerCase() !== sigHeader.toLowerCase()) {
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

    const status = payload.payment_status || payload.status;
    const order_id: string = payload.order_id || "";
    const payment_id: string = String(payload.payment_id || payload.id || "");
    const price_amount = Number(payload.price_amount || 0);
    const pay_amount = Number(payload.pay_amount || 0);
    const pay_currency = String(payload.pay_currency || "");

    // Update invoice record
    await supabase.from("nowpayments_invoices").upsert({
      order_id,
      payment_id,
      status,
      pay_amount,
      pay_currency,
      price_amount,
      raw_payload: payload,
    }, { onConflict: "order_id" });

    if (status === "finished") {
      // Expect order_id format: `${user_id}:${uuid}`
      const user_id = order_id.split(":")[0];
      let bonusPct = 0;
      if (price_amount >= 100) bonusPct = 0.25;
      else if (price_amount >= 75) bonusPct = 0.20;
      else if (price_amount >= 50) bonusPct = 0.15;
      else if (price_amount < 30) bonusPct = 0; // under minimum, we still record but do not credit

      if (price_amount >= 30) {
        const totalCredit = price_amount * (1 + bonusPct);
        // Credit wallet and record transaction
        await supabase.rpc("update_wallet_balance", {
          p_user_id: user_id,
          p_amount: totalCredit,
          p_transaction_type: "deposit",
          p_description: `NOWPayments deposit ${payment_id}`,
          p_transaction_hash: payment_id,
        });
        await supabase.from("nowpayments_invoices").update({
          status: "credited",
          bonus_applied: Math.round(bonusPct * 100),
        }).eq("order_id", order_id);
      } else {
        await supabase.from("nowpayments_invoices").update({ status: "under_minimum" }).eq("order_id", order_id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
