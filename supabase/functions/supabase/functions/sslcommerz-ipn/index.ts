import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const STORE_ID = Deno.env.get("SSLCOMMERZ_STORE_ID")!;
const STORE_PASS = Deno.env.get("SSLCOMMERZ_STORE_PASS")!;
const IS_SANDBOX = Deno.env.get("SSLCOMMERZ_IS_SANDBOX") === "true";
const VALIDATE_URL = IS_SANDBOX
  ? "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
  : "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://yourapp.com";

async function validatePayment(val_id: string) {
  const url = `${VALIDATE_URL}?val_id=${val_id}&store_id=${STORE_ID}&store_passwd=${STORE_PASS}&format=json`;
  const res = await fetch(url);
  return res.json();
}

async function processPayment(status: "success" | "failed" | "cancelled", body: Record<string, string>) {
  const { tran_id, val_id } = body;

  if (status === "success" && val_id) {
    const validation = await validatePayment(val_id);
    if (validation.status !== "VALID" && validation.status !== "VALIDATED") {
      return { error: "Payment validation failed" };
    }
  }

  const { data: payment } = await supabase
    .from("payments").select("id, tenant_id, subscription_id")
    .eq("gateway_tran_id", tran_id).maybeSingle();

  if (!payment) return { error: "Payment not found" };

  const updateData: Record<string, any> = { status, val_id: val_id || null, updated_at: new Date().toISOString(), raw_response: body };
  if (status === "cancelled") updateData.cancel_reason = body.error || "User cancelled";
  if (status === "success") {
    updateData.bank_tran_id = body.bank_tran_id;
    updateData.card_type = body.card_type;
    updateData.store_amount = parseFloat(body.store_amount || "0");
    updateData.ipn_received_at = new Date().toISOString();
  }

  await supabase.from("payments").update(updateData).eq("id", payment.id);

  if (status === "success" && payment.subscription_id) {
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setMonth(endsAt.getMonth() + 1);
    await supabase.from("tenant_subscriptions").update({
      status: "active", starts_at: now.toISOString(), ends_at: endsAt.toISOString(), updated_at: now.toISOString()
    }).eq("id", payment.subscription_id);

    if (payment.tenant_id) {
      await supabase.from("profiles").update({ organization_status: "active", updated_at: now.toISOString() }).eq("id", payment.tenant_id);
    }
  }

  return { success: true };
}

serve(async (req) => {
  const url = new URL(req.url);
  const action = url.pathname.split("/").pop()!;

  let body: Record<string, string> = {};
  if (req.method === "POST") {
    const form = await req.formData();
    for (const [k, v] of form.entries()) body[k] = v.toString();
  } else {
    for (const [k, v] of url.searchParams.entries()) body[k] = v;
  }

  let result: any;
  if (action === "success" || action === "ipn") result = await processPayment("success", body);
  else if (action === "fail" || action === "failure") result = await processPayment("failed", body);
  else if (action === "cancel") result = await processPayment("cancelled", body);
  else result = { error: "Unknown action" };

  if (action !== "ipn" && result?.success) {
    const redirects: Record<string, string> = {
      success: `${FRONTEND_URL}/subscription/success`,
      fail: `${FRONTEND_URL}/subscription/failed`,
      failure: `${FRONTEND_URL}/subscription/failed`,
      cancel: `${FRONTEND_URL}/subscription/cancelled`,
    };
    if (redirects[action]) return Response.redirect(redirects[action], 303);
  }

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
    status: result?.error ? 400 : 200,
  });
});
