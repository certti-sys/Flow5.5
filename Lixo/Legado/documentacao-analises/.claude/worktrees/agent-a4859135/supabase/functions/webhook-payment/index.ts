import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { z } from "https://esm.sh/zod@3.25.76";

// --- SCHEMAS ---

const NormalizedDataSchema = z.object({
  transactionId: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().optional(),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  status: z.enum(["approved", "refunded", "pending", "cancelled"]),
  eventType: z.enum(["purchase", "refund", "subscription_cancelled", "subscription_renewed"]),
  rawPayload: z.any(),
});

type NormalizedWebhookData = z.infer<typeof NormalizedDataSchema>;

// --- UTILITIES ---

function getValueByPath(obj: any, path: string): any {
  if (!path || !obj) return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      current = current[arrayMatch[1]]?.[parseInt(arrayMatch[2])];
    } else {
      current = current[part];
    }
  }
  return current;
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// --- SIGNATURE VALIDATIONS ---

async function validateWooCommerceSignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return true;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    return signature === expectedSignature;
  } catch (error) {
    logger.error("Error validating WooCommerce signature", error);
    return false;
  }
}

async function validateMercadoPagoSignature(
  headers: Headers,
  url: URL,
  secret: string
): Promise<boolean> {
  const xSignature = headers.get("x-signature");
  const xRequestId = headers.get("x-request-id");
  const dataId = url.searchParams.get("data.id");

  if (!xSignature || !xRequestId || !dataId || !secret) {
      logger.error("Missing signature headers or secret for MercadoPago");
      return false;
  }

  try {
      const parts = xSignature.split(',');
      let ts = "";
      let hash = "";

      parts.forEach(part => {
          const [key, value] = part.split('=');
          if (key.trim() === 'ts') ts = value.trim();
          if (key.trim() === 'v1') hash = value.trim();
      });

      if (!ts || !hash) return false;

      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
      );

      const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
      const calculatedHash = Array.from(new Uint8Array(signatureBuffer))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");

      return calculatedHash === hash;
  } catch (error) {
      logger.error("Error validating MP signature", error);
      return false;
  }
}

async function validateKiwifySignature(
  headers: Headers,
  body: string,
  secret: string
): Promise<boolean> {
  const signature = headers.get("x-kiwify-signature");
  if (!signature || !secret) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const calculatedHash = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return calculatedHash === signature;
  } catch (error) {
    logger.error("Error validating Kiwify signature", error);
    return false;
  }
}

function validateHotmartSignature(payload: any, token: string | undefined): boolean {
  if (!token) return true; // Se não configurado, ignora (não recomendado)
  return payload.hottok === token;
}

// --- LOGIC HELPERS ---

async function findOrCreateUser(
  supabase: any,
  email: string,
  name: string,
  phone?: string
): Promise<{ userId: string; isNew: boolean; tempPassword?: string }> {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const existingUser = users?.find(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase()
  );
  
  if (existingUser) {
    if (phone) await supabase.from("profiles").update({ whatsapp: phone }).eq("id", existingUser.id).is("whatsapp", null);
    return { userId: existingUser.id, isNew: false };
  }
  
  const tempPassword = generateTempPassword();
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name, whatsapp: phone },
  });
  
  if (createError) throw new Error(`Failed to create user: ${createError.message}`);
  
  if (phone) {
    await supabase.from("profiles").update({ whatsapp: phone }).eq("id", newUser.user.id);
  }
  return { userId: newUser.user.id, isNew: true, tempPassword };
}

async function sendWelcomeEmail(
  supabase: any,
  email: string,
  name: string,
  tempPassword: string
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const loginUrl = supabaseUrl.replace('.supabase.co', '.lovable.app') + '/login';
    
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        type: 'welcome',
        to: email,
        toName: name,
        data: {
          user_name: name,
          user_email: email,
          temp_password: tempPassword,
          login_url: loginUrl,
        }
      })
    });
  } catch (error) {
    logger.error("Error sending welcome email", error);
  }
}

async function grantCourseAccess(supabase: any, userId: string, courseId: string): Promise<void> {
  const { data: existingAccess } = await supabase.from("user_course_access").select("id").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  if (existingAccess) return;
  await supabase.from("user_course_access").insert({ user_id: userId, course_id: courseId });
}

async function grantCategoryAccess(supabase: any, userId: string, category: string): Promise<void> {
  const { data: existingAccess } = await supabase.from("user_course_categories").select("id").eq("user_id", userId).eq("category", category).maybeSingle();
  if (existingAccess) return;
  await supabase.from("user_course_categories").insert({ user_id: userId, category });
}

async function revokeAccess(supabase: any, userId: string, courseId?: string, category?: string): Promise<void> {
  if (courseId) {
    await supabase.from("user_course_access").delete().eq("user_id", userId).eq("course_id", courseId);
  }
  if (category) {
    await supabase.from("user_course_categories").delete().eq("user_id", userId).eq("category", category);
  }
}

// --- PAYLOAD PARSERS ---

async function parsePayloadDynamically(
  supabase: any,
  platformId: string,
  payload: any
): Promise<NormalizedWebhookData | null> {
  let fieldMappings = null;

  const { data: newMappings } = await supabase.from("webhook_field_mappings").select("*").eq("platform_id", platformId);
  if (newMappings && newMappings.length > 0) {
    fieldMappings = newMappings.map((m: any) => ({
      field_type: m.internal_field === 'user_email' ? 'email' :
                  m.internal_field === 'user_name' ? 'name' :
                  m.internal_field === 'user_phone' ? 'phone' :
                  m.internal_field === 'event_status' ? 'status' :
                  m.internal_field === 'transaction_id' ? 'transaction_id' :
                  m.internal_field === 'product_id' ? 'product_id' :
                  m.internal_field === 'product_name' ? 'product_name' : m.internal_field,
      json_path: m.source_path
    }));
  } else {
    const { data: legacyMappings } = await supabase.from("platform_field_mappings").select("*").eq("platform_id", platformId);
    fieldMappings = legacyMappings || [];
  }

  if (!fieldMappings || fieldMappings.length === 0) return null;

  const { data: statusMappings } = await supabase.from("platform_status_mappings").select("*").eq("platform_id", platformId);

  const getValue = (fieldType: string): string => {
    const mapping = fieldMappings.find((m: any) => m.field_type === fieldType);
    if (!mapping) return "";
    const value = getValueByPath(payload, mapping.json_path);
    return value !== undefined ? String(value) : "";
  };

  const rawStatus = getValue("status");
  let status: "approved" | "refunded" | "pending" | "cancelled" = "pending";
  if (statusMappings && statusMappings.length > 0) {
    const statusMapping = statusMappings.find((m: any) => m.external_value.toLowerCase() === rawStatus.toLowerCase());
    if (statusMapping) status = statusMapping.internal_status as any;
  }
  const eventType = status === "refunded" ? "refund" : "purchase";

  return {
    transactionId: getValue("transaction_id") || String(Date.now()),
    productId: getValue("product_id") || "unknown",
    productName: getValue("product_name") || undefined,
    customerEmail: getValue("email") || "",
    customerName: getValue("name") || "Unknown",
    customerPhone: getValue("phone") || undefined,
    status,
    eventType,
    rawPayload: payload,
  };
}

function parseWooCommercePayload(payload: any): NormalizedWebhookData {
  const mapWooCommerceStatus = (wcStatus: string): any => {
    const statusMap: any = { "completed": "approved", "processing": "approved", "on-hold": "pending", "pending": "pending", "refunded": "refunded", "cancelled": "cancelled", "failed": "cancelled" };
    return statusMap[wcStatus] || "pending";
  };
  const status = mapWooCommerceStatus(payload.status);
  const firstItem = payload.line_items?.[0] || {};
  return {
    transactionId: String(payload.id || payload.order_id || Date.now()),
    productId: String(firstItem.product_id || firstItem.id || "unknown"),
    productName: firstItem.name || "Unknown Product",
    customerEmail: payload.billing?.email || payload.email || "",
    customerName: `${payload.billing?.first_name || ""} ${payload.billing?.last_name || ""}`.trim() || "Unknown",
    customerPhone: payload.billing?.phone || payload.phone || undefined,
    status,
    eventType: status === "refunded" ? "refund" : "purchase",
    rawPayload: payload,
  };
}

// --- MAIN HANDLER ---

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const isLearningMode = pathParts[pathParts.length - 1] === "learn";
  const platformName = isLearningMode 
    ? pathParts[pathParts.length - 2] 
    : pathParts[pathParts.length - 1] || "unknown";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let body = "";
  let payload: any = {};
  try {
    body = await req.text();
    if (body) payload = JSON.parse(body);
  } catch (e) {
    logger.error("Invalid JSON in webhook payload", { error: e });
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  logger.info(`Webhook received`, { platform: platformName, isLearningMode });

  // --- PLATFORM VALIDATION ---
  const { data: platform } = await supabase.from("webhook_platforms").select("*").eq("name", platformName).maybeSingle();
  if (!platform) {
    logger.error(`Platform '${platformName}' not found`);
    return new Response(JSON.stringify({ error: `Platform '${platformName}' not found` }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // --- RATE LIMITING ---
  const rateLimit = await checkRateLimit(
    supabase,
    platform.id,
    'webhook-payment',
    100, // 100 requests
    60  // per minute
  );

  if (!rateLimit.allowed) {
    logger.warn(`Rate limit exceeded for platform ${platformName}`);
    return new Response(
      JSON.stringify({ 
        error: "Too many requests", 
        retryAfter: rateLimit.retryAfter 
      }), 
      { 
        status: 429, 
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateLimit.retryAfter) } 
      }
    );
  }

  // Security checks
  if (platformName === "mercadopago") {
    const mpSecret = Deno.env.get("MP_WEBHOOK_SECRET");
    if (mpSecret) {
      const isValid = await validateMercadoPagoSignature(req.headers, url, mpSecret);
      if (!isValid) {
        logger.error("Invalid MercadoPago signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
  } else if (platformName === "woocommerce") {
    const signature = req.headers.get("X-WC-Webhook-Signature");
    const isValid = await validateWooCommerceSignature(body, signature, platform.webhook_secret);
    if (!isValid) {
      logger.error("Invalid WooCommerce signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } else if (platformName === "hotmart") {
    const hotmartToken = Deno.env.get("HOTMART_WEBHOOK_TOKEN");
    const isValid = validateHotmartSignature(payload, hotmartToken);
    if (!isValid) {
      logger.error("Invalid Hotmart token");
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } else if (platformName === "kiwify") {
    const kiwifySecret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");
    if (kiwifySecret) {
      const isValid = await validateKiwifySignature(req.headers, body, kiwifySecret);
      if (!isValid) {
        logger.error("Invalid Kiwify signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
  }

  if (isLearningMode) {
    logger.info("Learning mode: saving sample payload", { platformId: platform.id });
    await supabase.from("webhook_samples").delete().eq("platform_id", platform.id);
    await supabase.from("webhook_samples").insert({ platform_id: platform.id, raw_payload: payload });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!platform.is_active) {
    logger.info("Platform inactive, ignoring webhook", { platform: platformName });
    return new Response(JSON.stringify({ error: "Platform inactive" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // --- PARSING & PROCESSING ---
  let normalizedData = await parsePayloadDynamically(supabase, platform.id, payload);
  if (!normalizedData && platformName === "woocommerce") {
    normalizedData = parseWooCommercePayload(payload);
  }

  if (!normalizedData) {
    logger.error("Mapping required for platform", { platform: platformName });
    await supabase.from("webhook_transactions").insert({ platform_id: platform.id, external_transaction_id: String(Date.now()), customer_email: "unknown@webhook.local", status: "error", event_type: "unknown", raw_payload: payload, error_message: "Configure field mappings" });
    return new Response(JSON.stringify({ error: "Mapping required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // --- ZOD VALIDATION ---
  const validation = NormalizedDataSchema.safeParse(normalizedData);
  if (!validation.success) {
    logger.error("Normalized data validation failed", { errors: validation.error.format() });
    await supabase.from("webhook_transactions").insert({ 
      platform_id: platform.id, 
      external_transaction_id: normalizedData.transactionId || String(Date.now()), 
      customer_email: normalizedData.customerEmail || "invalid@webhook.local", 
      status: "error", 
      event_type: "unknown", 
      raw_payload: payload, 
      error_message: `Validation failed: ${JSON.stringify(validation.error.format())}` 
    });
    return new Response(JSON.stringify({ error: "Validation failed", details: validation.error.format() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  normalizedData = validation.data;

  logger.info("Processing webhook data", { 
    transactionId: normalizedData.transactionId, 
    email: normalizedData.customerEmail,
    status: normalizedData.status 
  });

  const { data: existingTx } = await supabase.from("webhook_transactions").select("id").eq("platform_id", platform.id).eq("external_transaction_id", normalizedData.transactionId).maybeSingle();
  if (existingTx) {
    logger.info("Webhook already processed", { transactionId: normalizedData.transactionId });
    return new Response(JSON.stringify({ message: "Processed" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: mapping } = await supabase.from("product_mappings").select("*, course:courses(*)").eq("platform_id", platform.id).eq("external_product_id", normalizedData.productId).eq("is_active", true).maybeSingle();

  if (!mapping) {
    logger.error("Product mapping not found", { productId: normalizedData.productId, platform: platformName });
    await supabase.from("webhook_transactions").insert({ platform_id: platform.id, external_transaction_id: normalizedData.transactionId, external_product_id: normalizedData.productId, customer_email: normalizedData.customerEmail, status: "error", event_type: normalizedData.eventType, raw_payload: payload, error_message: "Product mapping not found" });
    return new Response(JSON.stringify({ error: "Mapping missing" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let userId: string | null = null;
  let procRes: any = {};

  try {
    if (normalizedData.status === "approved") {
      const res = await findOrCreateUser(supabase, normalizedData.customerEmail, normalizedData.customerName, normalizedData.customerPhone);
      userId = res.userId;
      if (mapping.grant_type === "course") await grantCourseAccess(supabase, userId, mapping.course_id);
      else await grantCategoryAccess(supabase, userId, mapping.category);
      if (res.isNew) await sendWelcomeEmail(supabase, normalizedData.customerEmail, normalizedData.customerName, res.tempPassword!);
      procRes = { success: true, action: "granted" };
    } else if (["refunded", "cancelled"].includes(normalizedData.status)) {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const u = users?.find((u: any) => u.email?.toLowerCase() === normalizedData!.customerEmail.toLowerCase());
      if (u) {
        userId = u.id;
        await revokeAccess(supabase, userId, mapping.course_id, mapping.category);
        procRes = { success: true, action: "revoked" };
      }
    }

    await supabase.from("webhook_transactions").insert({ platform_id: platform.id, external_transaction_id: normalizedData.transactionId, external_product_id: normalizedData.productId, customer_email: normalizedData.customerEmail, status: normalizedData.status, event_type: normalizedData.eventType, raw_payload: payload, user_id: userId, course_id: mapping.course_id, processed_at: new Date().toISOString(), processing_result: procRes });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    logger.error("Error processing webhook transaction", error);
    return new Response(JSON.stringify({ error: "Internal processing error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
