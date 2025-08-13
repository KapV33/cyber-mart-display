import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Minimal NOWPayments invoice creation
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const NOWPAY_API_KEY = Deno.env.get("NOWPAYMENTS_API_KEY") ?? "";

  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  try {
    const { amount } = await req.json();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }
    if (!NOWPAY_API_KEY) throw new Error("NOWPAYMENTS_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr) throw new Error(`Auth error: ${userErr.message}`);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    const orderId = `wallet_${user.id}_${Date.now()}`;
    const ipnUrl = `https://vqxydudmllhvjdvtsxla.functions.supabase.co/nowpayments-webhook`;

    const body = {
      price_amount: Number(amount),
      price_currency: "usd",
      order_id: orderId,
      ipn_callback_url: ipnUrl,
      success_url: `${req.headers.get("origin") || "https://example.com"}/profile`,
      cancel_url: `${req.headers.get("origin") || "https://example.com"}/profile`,
    };

    const npRes = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NOWPAY_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const npJson = await npRes.json();
    if (!npRes.ok) {
      console.error("NOWPayments error", npJson);
      throw new Error(npJson?.message || "Failed to create invoice");
    }

    // Store invoice (optional, webhook will upsert too)
    try {
      await serviceClient.from("nowpayments_invoices").upsert({
        user_id: user.id,
        order_id: orderId,
        invoice_url: npJson.invoice_url ?? null,
        status: "pending",
        price_amount: Number(amount),
        price_currency: "usd",
        raw_payload: npJson,
      }, { onConflict: "order_id" });
    } catch (e) {
      console.warn("Failed to upsert invoice pre-webhook", e);
    }

    return new Response(JSON.stringify({ url: npJson.invoice_url, order_id: orderId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
