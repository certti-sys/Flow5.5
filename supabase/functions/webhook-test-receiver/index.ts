// Endpoint de teste dos webhooks de saída (item 4 das pendências).
//
// Recebe o POST do dispatch-webhooks, valida a assinatura X-Flow-Signature e o
// bearer opcional contra o próprio endpoint (service role lê webhook_endpoints)
// e grava um receipt. Não é destinatário de produção — é o "request bin" do
// projeto, para exercitar a fila ponta a ponta sem depender de terceiros.
//
// Assinatura esperada (ver _shared/webhook-dispatch.ts):
//   X-Flow-Signature: t=<unix>,v1=<hex HMAC_SHA256(secret, `${t}.${body}`)>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verify(secret: string, timestamp: number, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  return `t=${timestamp},v1=${toHex(sig)}`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: corsHeaders });
  }

  const body = await req.text();
  const deliveryId = req.headers.get("X-Flow-Delivery") ?? "";
  const signature = req.headers.get("X-Flow-Signature") ?? "";
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  let secret: string | null = null;
  let expectedBearer: string | null = null;
  let event: string | null = null;
  if (deliveryId) {
    const { data: delivery } = await supabase
      .from("webhook_deliveries").select("endpoint_id, event").eq("id", deliveryId).maybeSingle();
    event = delivery?.event ?? null;
    if (delivery?.endpoint_id) {
      const { data: endpoint } = await supabase
        .from("webhook_endpoints").select("secret, bearer_token").eq("id", delivery.endpoint_id).maybeSingle();
      secret = endpoint?.secret ?? null;
      expectedBearer = endpoint?.bearer_token ?? null;
    }
  }

  let signatureValid = false;
  if (secret) {
    const m = /^t=(\d+),v1=([a-f0-9]+)$/i.exec(signature);
    if (m) {
      const expected = await verify(secret, Number(m[1]), body);
      signatureValid = expected.toLowerCase() === signature.toLowerCase();
    }
  }
  const bearerOk = expectedBearer ? bearer === expectedBearer : true;

  try {
    await supabase.from("webhook_test_receipts").insert({
      delivery_id: deliveryId,
      event,
      signature_valid: signatureValid,
      bearer_ok: bearerOk,
      body: JSON.parse(body),
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true, signature_valid: signatureValid, bearer_ok: bearerOk }), {
    status: signatureValid && bearerOk ? 200 : 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
