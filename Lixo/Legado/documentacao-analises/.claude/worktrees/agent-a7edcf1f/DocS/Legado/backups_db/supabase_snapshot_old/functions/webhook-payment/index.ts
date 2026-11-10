import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tipos normalizados
interface NormalizedWebhookData {
  transactionId: string;
  productId: string;
  productName?: string;
  customerEmail: string;
  customerName: string;
  status: "approved" | "refunded" | "pending" | "cancelled";
  eventType: "purchase" | "refund" | "subscription_cancelled" | "subscription_renewed";
  rawPayload: any;
}

// ==================== HELPER FUNCTIONS ====================

// Extrair valor de um objeto usando path com notação de ponto (ex: "data.buyer.email")
function getValueByPath(obj: any, path: string): any {
  if (!path || !obj) return undefined;
  
  const parts = path.split(".");
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    
    // Suporte para arrays com índice: "items[0]"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      current = current[arrayMatch[1]]?.[parseInt(arrayMatch[2])];
    } else {
      current = current[part];
    }
  }
  
  return current;
}

// ==================== PARSER DINÂMICO ====================

async function parsePayloadDynamically(
  supabase: any,
  platformId: string,
  payload: any
): Promise<NormalizedWebhookData | null> {
  // Buscar mapeamentos de campos
  const { data: fieldMappings, error: fieldError } = await supabase
    .from("platform_field_mappings")
    .select("*")
    .eq("platform_id", platformId);

  if (fieldError || !fieldMappings || fieldMappings.length === 0) {
    console.log(`No field mappings found for platform ${platformId}`);
    return null;
  }

  // Buscar mapeamentos de status
  const { data: statusMappings } = await supabase
    .from("platform_status_mappings")
    .select("*")
    .eq("platform_id", platformId);

  // Extrair valores usando os paths configurados
  const getValue = (fieldType: string): string => {
    const mapping = fieldMappings.find((m: any) => m.field_type === fieldType);
    if (!mapping) return "";
    const value = getValueByPath(payload, mapping.json_path);
    return value !== undefined ? String(value) : "";
  };

  const rawStatus = getValue("status");
  
  // Mapear status externo para interno
  let status: "approved" | "refunded" | "pending" | "cancelled" = "pending";
  if (statusMappings && statusMappings.length > 0) {
    const statusMapping = statusMappings.find(
      (m: any) => m.external_value.toLowerCase() === rawStatus.toLowerCase()
    );
    if (statusMapping) {
      status = statusMapping.internal_status as any;
    }
  }

  const eventType = status === "refunded" ? "refund" : "purchase";

  return {
    transactionId: getValue("transaction_id") || String(Date.now()),
    productId: getValue("product_id") || "unknown",
    productName: getValue("product_name") || undefined,
    customerEmail: getValue("email") || "",
    customerName: getValue("name") || "Unknown",
    status,
    eventType,
    rawPayload: payload,
  };
}

// ==================== PARSERS LEGADOS (FALLBACK) ====================

// WooCommerce Parser
function parseWooCommercePayload(payload: any): NormalizedWebhookData {
  const status = mapWooCommerceStatus(payload.status);
  const eventType = status === "refunded" ? "refund" : "purchase";
  
  const firstItem = payload.line_items?.[0] || {};
  
  return {
    transactionId: String(payload.id || payload.order_id || Date.now()),
    productId: String(firstItem.product_id || firstItem.id || "unknown"),
    productName: firstItem.name || "Unknown Product",
    customerEmail: payload.billing?.email || payload.email || "",
    customerName: `${payload.billing?.first_name || ""} ${payload.billing?.last_name || ""}`.trim() || "Unknown",
    status,
    eventType,
    rawPayload: payload,
  };
}

function mapWooCommerceStatus(wcStatus: string): "approved" | "refunded" | "pending" | "cancelled" {
  const statusMap: Record<string, "approved" | "refunded" | "pending" | "cancelled"> = {
    "completed": "approved",
    "processing": "approved",
    "on-hold": "pending",
    "pending": "pending",
    "refunded": "refunded",
    "cancelled": "cancelled",
    "failed": "cancelled",
  };
  return statusMap[wcStatus] || "pending";
}

async function validateWooCommerceSignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) {
    console.log("WooCommerce: No signature or secret provided, skipping validation");
    return true;
  }
  
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
  } catch (error) {\n    console.error("WooCommerce signature validation error:", error);
    return false;
  }
}

// ==================== FUNÇÕES DE PROCESSAMENTO ====================

async function findOrCreateUser(
  supabase: any,
  email: string,
  name: string
): Promise<{ userId: string; isNew: boolean; tempPassword?: string }> {
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase()
  );
  
  if (existingUser) {
    console.log(`User found: ${existingUser.id}`);
    return { userId: existingUser.id, isNew: false };
  }
  
  const tempPassword = generateTempPassword();
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name },
  });
  
  if (createError) {
    console.error("Error creating user:", createError);
    throw new Error(`Failed to create user: ${createError.message}`);
  }
  
  console.log(`New user created: ${newUser.user.id}`);
  
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
    const loginUrl = supabaseUrl.replace('.supabase.co', '.lovable.app') + '/login';\n    \n    console.log(`Sending welcome email to ${email}`);\n    \n    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,\n      },\n      body: JSON.stringify({\n        type: 'welcome',\n        to: email,\n        toName: name,\n        data: {\n          user_name: name,\n          user_email: email,\n          temp_password: tempPassword,\n          login_url: loginUrl,\n        }\n      })\n    });\n\n    if (!response.ok) {\n      const errorText = await response.text();\n      console.error(`Failed to send welcome email: ${response.status} - ${errorText}`);\n    } else {\n      console.log(`Welcome email sent successfully to ${email}`);\n    }\n  } catch (error) {\n    console.error("Error sending welcome email:", error);\n  }\n}\n\nfunction generateTempPassword(): string {\n  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";\n  let password = "";\n  for (let i = 0; i < 12; i++) {\n    password += chars.charAt(Math.floor(Math.random() * chars.length));\n  }\n  return password;\n}\n\nasync function grantCourseAccess(\n  supabase: any,\n  userId: string,\n  courseId: string\n): Promise<void> {\n  const { data: existingAccess } = await supabase\n    .from("user_course_access")\n    .select("id")\n    .eq("user_id", userId)\n    .eq("course_id", courseId)\n    .maybeSingle();\n  \n  if (existingAccess) {\n    console.log(`User ${userId} already has access to course ${courseId}`);\n    return;\n  }\n  \n  const { error } = await supabase.from("user_course_access").insert({\n    user_id: userId,\n    course_id: courseId,\n  });\n  \n  if (error) {\n    console.error("Error granting course access:", error);\n    throw new Error(`Failed to grant course access: ${error.message}`);\n  }\n  \n  console.log(`Access granted: user ${userId} -> course ${courseId}`);\n}\n\nasync function grantCategoryAccess(\n  supabase: any,\n  userId: string,\n  category: string\n): Promise<void> {\n  const { data: existingAccess } = await supabase\n    .from("user_course_categories")\n    .select("id")\n    .eq("user_id", userId)\n    .eq("category", category)\n    .maybeSingle();\n  \n  if (existingAccess) {\n    console.log(`User ${userId} already has access to category ${category}`);\n    return;\n  }\n  \n  const { error } = await supabase.from("user_course_categories").insert({\n    user_id: userId,\n    category,\n  });\n  \n  if (error) {\n    console.error("Error granting category access:", error);\n    throw new Error(`Failed to grant category access: ${error.message}`);\n  }\n  \n  console.log(`Category access granted: user ${userId} -> category ${category}`);\n}\n\nasync function revokeAccess(\n  supabase: any,\n  userId: string,\n  courseId?: string,\n  category?: string\n): Promise<void> {\n  if (courseId) {\n    await supabase\n      .from("user_course_access")\n      .delete()\n      .eq("user_id", userId)\n      .eq("course_id", courseId);\n    console.log(`Access revoked: user ${userId} -> course ${courseId}`);\n  }\n  \n  if (category) {\n    await supabase\n      .from("user_course_categories")\n      .delete()\n      .eq("user_id", userId)\n      .eq("category", category);\n    console.log(`Category access revoked: user ${userId} -> category ${category}`);\n  }\n}\n\n// ==================== HANDLER PRINCIPAL ====================\n\nDeno.serve(async (req) => {\n  // CORS preflight\n  if (req.method === "OPTIONS") {\n    return new Response(null, { headers: corsHeaders });\n  }\n\n  const url = new URL(req.url);\n  const pathParts = url.pathname.split("/").filter(Boolean);\n  \n  // Detectar modo de aprendizado: /webhook-payment/{platform}/learn\n  const isLearningMode = pathParts[pathParts.length - 1] === "learn";\n  const platformName = isLearningMode \n    ? pathParts[pathParts.length - 2] \n    : pathParts[pathParts.length - 1] || "unknown";\n\n  console.log(`\\n========== WEBHOOK RECEIVED ==========`);\n  console.log(`Platform: ${platformName}`);\n  console.log(`Learning Mode: ${isLearningMode}`);\n  console.log(`Method: ${req.method}`);\n  console.log(`URL: ${req.url}`);\n\n  const supabase = createClient(\n    Deno.env.get("SUPABASE_URL") ?? "",\n    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""\n  );\n\n  let body = "";\n  let payload: any = {};\n\n  try {\n    body = await req.text();\n    console.log(`Raw body length: ${body.length}`);\n    \n    if (body) {\n      payload = JSON.parse(body);\n      console.log(`Parsed payload keys: ${Object.keys(payload).join(", ")}`);\n    }\n  } catch (e) {\n    console.error("Failed to parse JSON body:", e);\n    return new Response(JSON.stringify({ error: "Invalid JSON" }), {\n      status: 400,\n      headers: { ...corsHeaders, "Content-Type": "application/json" },\n    });\n  }\n\n  // Buscar configuração da plataforma\n  const { data: platform, error: platformError } = await supabase\n    .from("webhook_platforms")\n    .select("*")\n    .eq("name", platformName)\n    .maybeSingle();\n\n  if (platformError || !platform) {\n    console.error(`Platform not found: ${platformName}`);\n    return new Response(\n      JSON.stringify({ error: `Platform '${platformName}' not found` }),\n      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }\n    );\n  }\n\n  console.log(`Platform found: ${platform.display_name} (ID: ${platform.id})`);\n\n  // ==================== MODO DE APRENDIZADO ====================\n  if (isLearningMode) {\n    console.log("Processing in LEARNING MODE - saving payload sample");\n    \n    // Deletar amostras anteriores desta plataforma (manter apenas a mais recente)\n    await supabase\n      .from("webhook_samples")\n      .delete()\n      .eq("platform_id", platform.id);\n    \n    // Salvar nova amostra\n    const { error: sampleError } = await supabase\n      .from("webhook_samples")\n      .insert({\n        platform_id: platform.id,\n        raw_payload: payload,\n      });\n\n    if (sampleError) {\n      console.error("Error saving webhook sample:", sampleError);\n      return new Response(\n        JSON.stringify({ error: "Failed to save webhook sample", details: sampleError.message }),\n        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }\n      );\n    }\n\n    console.log("Webhook sample saved successfully for learning");\n    \n    return new Response(\n      JSON.stringify({ \n        success: true, \n        message: "Payload capturado com sucesso para aprendizado",\n        platform: platform.display_name,\n        fieldsReceived: Object.keys(payload).length,\n      }),\n      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }\n    );\n  }\n\n  // ==================== MODO NORMAL DE PROCESSAMENTO ====================\n  \n  if (!platform.is_active) {\n    console.error(`Platform is inactive: ${platformName}`);\n    return new Response(\n      JSON.stringify({ error: `Platform '${platformName}' is inactive` }),\n      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }\n    );\n  }\n\n  let normalizedData: NormalizedWebhookData | null = null;\n  let transactionId = "";\n  let processingResult: any = { success: false };\n\n  try {\n    // Tentar usar mapeamento dinâmico primeiro\n    normalizedData = await parsePayloadDynamically(supabase, platform.id, payload);\n    \n    // Se não tem mapeamento dinâmico, usar parser legado\n    if (!normalizedData) {\n      console.log("No dynamic mappings found, trying legacy parser...");\n      \n      switch (platformName) {\n        case "woocommerce": {\n          const signature = req.headers.get("X-WC-Webhook-Signature");\n          const isValid = await validateWooCommerceSignature(body, signature, platform.webhook_secret);\n          \n          if (!isValid) {\n            console.error("WooCommerce: Invalid signature");\n            return new Response(JSON.stringify({ error: "Invalid signature" }), {\n              status: 401,\n              headers: { ...corsHeaders, "Content-Type": "application/json" },\n            });\n          }\n          \n          normalizedData = parseWooCommercePayload(payload);\n          break;\n        }\n        \n        default:\n          // Sem mapeamento dinâmico e sem parser legado\n          console.error(`No parser available for platform '${platformName}'`);\n          \n          // Registrar tentativa para análise\n          await supabase.from("webhook_transactions").insert({\n            platform_id: platform.id,\n            external_transaction_id: String(Date.now()),\n            customer_email: "unknown@webhook.local",\n            status: "error",\n            event_type: "unknown",\n            raw_payload: payload,\n            error_message: `Configure os mapeamentos de campos para a plataforma ${platform.display_name}`,\n          });\n          \n          return new Response(\n            JSON.stringify({ \n              error: `Platform '${platformName}' requires field mapping configuration`,\n              hint: "Configure os mapeamentos de campos no painel admin em Webhooks → Configurar → Mapear Campos"\n            }),\n            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }\n          );\n      }\n    } else {\n      console.log("Using dynamic field mappings");\n    }\n\n    transactionId = normalizedData.transactionId;\n    console.log(`Normalized data:`, JSON.stringify(normalizedData, null, 2));\n\n    // Verificar idempotência\n    const { data: existingTx } = await supabase\n      .from("webhook_transactions")\n      .select("id, status")\n      .eq("platform_id", platform.id)\n      .eq("external_transaction_id", transactionId)\n      .maybeSingle();\n\n    if (existingTx) {\n      console.log(`Transaction already processed: ${transactionId}`);\n      return new Response(\n        JSON.stringify({ message: "Transaction already processed", transactionId }),\n        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }\n      );\n    }\n\n    // Buscar mapeamento do produto\n    const { data: mapping } = await supabase\n      .from("product_mappings")\n      .select("*, course:courses(*)")\n      .eq("platform_id", platform.id)\n      .eq("external_product_id", normalizedData.productId)\n      .eq("is_active", true)\n      .maybeSingle();\n\n    if (!mapping) {\n      console.warn(`No product mapping found for product ${normalizedData.productId}`);\n      \n      await supabase.from("webhook_transactions").insert({\n        platform_id: platform.id,\n        external_transaction_id: transactionId,\n        external_product_id: normalizedData.productId,\n        customer_email: normalizedData.customerEmail,\n        customer_name: normalizedData.customerName,\n        status: "error",\n        event_type: normalizedData.eventType,\n        raw_payload: normalizedData.rawPayload,\n        error_message: `No product mapping found for product ID: ${normalizedData.productId}`,\n      });\n      \n      return new Response(\n        JSON.stringify({ \n          error: "Product mapping not found", \n          productId: normalizedData.productId,\n          hint: "Configure o mapeamento do produto no painel admin"\n        }),\n        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }\n      );\n    }\n\n    console.log(`Product mapping found: ${mapping.grant_type} -> ${mapping.course_id || mapping.category}`);\n\n    // Processar baseado no status\n    let userId: string | null = null;\n    let courseId: string | null = mapping.course_id;\n\n    if (normalizedData.status === "approved") {\n      const userResult = await findOrCreateUser(\n        supabase,\n        normalizedData.customerEmail,\n        normalizedData.customerName\n      );\n      userId = userResult.userId;\n\n      if (mapping.grant_type === "course" && mapping.course_id) {\n        await grantCourseAccess(supabase, userId, mapping.course_id);\n      } else if (mapping.grant_type === "category" && mapping.category) {\n        await grantCategoryAccess(supabase, userId, mapping.category);\n      }\n\n      if (userResult.isNew && userResult.tempPassword) {\n        await sendWelcomeEmail(\n          supabase,\n          normalizedData.customerEmail,\n          normalizedData.customerName,\n          userResult.tempPassword\n        );\n      }\n\n      processingResult = {\n        success: true,\n        action: "access_granted",\n        userId,\n        isNewUser: userResult.isNew,\n        grantType: mapping.grant_type,\n        courseId: mapping.course_id,\n        category: mapping.category,\n      };\n      \n    } else if (normalizedData.status === "refunded" || normalizedData.status === "cancelled") {\n      const { data: existingUsers } = await supabase.auth.admin.listUsers();\n      const customerEmail = normalizedData!.customerEmail;\n      const existingUser = existingUsers?.users?.find(\n        (u: any) => u.email?.toLowerCase() === customerEmail.toLowerCase()\n      );\n\n      if (existingUser) {\n        userId = existingUser.id;\n        await revokeAccess(supabase, userId, mapping.course_id, mapping.category);\n        \n        processingResult = {\n          success: true,\n          action: "access_revoked",\n          userId,\n          grantType: mapping.grant_type,\n          courseId: mapping.course_id,\n          category: mapping.category,\n        };\n      } else {\n        processingResult = {\n          success: true,\n          action: "no_action",\n          reason: "User not found for revocation",\n        };\n      }\n    } else {\n      processingResult = {\n        success: true,\n        action: "no_action",\n        reason: `Status '${normalizedData.status}' does not require action`,\n      };\n    }\n\n    // Registrar transação\n    await supabase.from("webhook_transactions").insert({\n      platform_id: platform.id,\n      external_transaction_id: transactionId,\n      external_product_id: normalizedData.productId,\n      customer_email: normalizedData.customerEmail,\n      customer_name: normalizedData.customerName,\n      status: normalizedData.status,\n      event_type: normalizedData.eventType,\n      raw_payload: normalizedData.rawPayload,\n      user_id: userId,\n      course_id: courseId,\n      processed_at: new Date().toISOString(),\n      processing_result: processingResult,\n    });\n\n    console.log(`Transaction recorded: ${transactionId}`);\n    console.log(`Processing result:`, JSON.stringify(processingResult, null, 2));\n\n    return new Response(\n      JSON.stringify({\n        success: true,\n        transactionId,\n        status: normalizedData.status,\n        processingResult,\n      }),\n      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }\n    );\n\n  } catch (error: any) {\n    console.error("Processing error:", error);\n\n    // Tentar registrar erro na transação\n    try {\n      await supabase.from("webhook_transactions").insert({\n        platform_id: platform.id,\n        external_transaction_id: transactionId || String(Date.now()),\n        external_product_id: normalizedData?.productId,\n        customer_email: normalizedData?.customerEmail || "error@webhook.local",\n        customer_name: normalizedData?.customerName,\n        status: "error",\n        event_type: normalizedData?.eventType || "unknown",\n        raw_payload: payload,\n        error_message: error.message,\n      });\n    } catch (logError) {\n      console.error("Failed to log error:", logError);\n    }\n\n    return new Response(\n      JSON.stringify({ error: "Processing failed", message: error.message }),\n      { status: 500, headers: { ...corsHeaders, \"Content-Type\": \"application/json\" } }\n    );\n  }\n});\n
