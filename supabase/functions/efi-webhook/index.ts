// Webhook do Efí (antiga Gerencianet)
//
// A Efí envia dois formatos para a mesma URL:
//  1) PIX:       { "pix": [{ "txid": "..." }] }  (sem status)
//  2) Cobranças: { "notification": "token" }     (boleto / link de cartão)
//
// NUNCA confiamos no corpo: reconsultamos a cobrança PIX (GET /v2/cob/{txid},
// com mTLS) ou a cobrança da API Cobranças (GET /v1/charge/{id}) antes de
// alterar qualquer status.
//
// Assinatura opcional: se a credencial tiver webhook_secret, exigimos
// ?hmac=<valor> na URL (mesmo modelo do driver de referência).
//
// IMPORTANTE: esta função roda com `verify_jwt = false` (ver config.toml).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type InternalStatus = "pending" | "paid" | "failed";

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

function mapChargeStatus(status: string): InternalStatus {
    const s = String(status || "").toLowerCase();
    if (["paid", "settled"].includes(s)) return "paid";
    if (["canceled", "cancelled", "expired", "refunded", "contested", "unpaid"].includes(s)) return "failed";
    return "pending";
}

function mapPixStatus(status: string): InternalStatus {
    const s = String(status || "").toUpperCase();
    if (s === "CONCLUIDA") return "paid";
    if (["REMOVIDA_PELO_USUARIO_RECEBEDOR", "REMOVIDA_PELO_PSP", "CANCELADA"].includes(s)) return "failed";
    return "pending";
}

/** Detecta estorno total/parcial no payload de uma cobrança PIX concluída. */
function pixRefund(cob: any): { hasRefund: boolean; isFullRefund: boolean } {
    const total = Number(cob?.valor?.original ?? 0);
    let refunded = 0;
    let hasRefund = false;

    const pixes = Array.isArray(cob?.pix) ? cob.pix : [];
    for (const pix of pixes) {
        const devolucoes = Array.isArray(pix?.devolucoes) ? pix.devolucoes : [];
        for (const refund of devolucoes) {
            const status = String(refund?.status || "").toUpperCase();
            if (status === "DEVOLVIDO" || status === "EM_PROCESSAMENTO") {
                hasRefund = true;
                refunded += Number(refund?.valor ?? 0);
            }
        }
    }

    const isFullRefund = hasRefund && total > 0 && refunded >= total - 0.01;
    return { hasRefund, isFullRefund };
}

async function p12ToPem(base64: string, password: string): Promise<{ cert: string; key: string }> {
    const specifier = "https://esm.sh/node-forge@1.3.1";
    const forgeModule: any = await import(specifier);
    const forge = forgeModule.default ?? forgeModule;

    const clean = String(base64 || "").replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
    const der = forge.util.decode64(clean);
    const asn1 = forge.asn1.fromDer(der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password || "");

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
    const keyBags = [
        ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? []),
        ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? []),
    ];

    if (!certBags.length || !keyBags.length) {
        throw new Error("Efí: não foi possível ler o certificado P12 (verifique a senha).");
    }

    return {
        cert: certBags.map((bag: any) => forge.pki.certificateToPem(bag.cert)).join("\n"),
        key: forge.pki.privateKeyToPem(keyBags[0].key),
    };
}

class EfiApi {
    private clientId: string;
    private clientSecret: string;
    private pixBase: string;
    private cobBase: string;
    private certificateP12?: string;
    private certificatePassword: string;
    private token = "";
    private tokenExpiresAt = 0;
    private client: any = null;

    constructor(opts: {
        clientId: string;
        clientSecret: string;
        sandbox: boolean;
        certificateP12?: string;
        certificatePassword?: string;
    }) {
        this.clientId = opts.clientId;
        this.clientSecret = opts.clientSecret;
        this.pixBase = opts.sandbox
            ? "https://pix-h.api.efipay.com.br"
            : "https://pix.api.efipay.com.br";
        this.cobBase = opts.sandbox
            ? "https://cobrancas-h.api.efipay.com.br"
            : "https://cobrancas.api.efipay.com.br";
        this.certificateP12 = opts.certificateP12;
        this.certificatePassword = opts.certificatePassword || "";
    }

    private async httpClient() {
        if (this.client) return this.client;
        if (!this.certificateP12) {
            throw new Error("Efí: certificado P12 ausente.");
        }

        const create = (Deno as any).createHttpClient;
        if (typeof create !== "function") {
            throw new Error("Efí: runtime sem suporte a mTLS.");
        }

        const pem = await p12ToPem(this.certificateP12, this.certificatePassword);
        this.client = create({ cert: pem.cert, key: pem.key });
        return this.client;
    }

    /** Token da API Cobranças (sem mTLS). */
    async cobToken(): Promise<string> {
        const res = await fetch(`${this.cobBase}/v1/authorize`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ grant_type: "client_credentials" }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.access_token) {
            throw new Error(`Efí: falha no OAuth da API Cobranças (${res.status})`);
        }
        return String(data.access_token);
    }

    /** Token da API PIX (exige mTLS). */
    async pixToken(): Promise<string> {
        const client = await this.httpClient();
        const res = await fetch(`${this.pixBase}/oauth/token`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ grant_type: "client_credentials" }),
            client,
        } as any);

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.access_token) {
            throw new Error(`Efí: falha no OAuth da API PIX (${res.status})`);
        }
        return String(data.access_token);
    }

    private async cobGet(endpoint: string): Promise<any> {
        if (!this.token || this.tokenExpiresAt <= Date.now()) {
            this.token = await this.cobToken();
            this.tokenExpiresAt = Date.now() + 8 * 60 * 1000;
        }

        const res = await fetch(`${this.cobBase}${endpoint}`, {
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/json",
            },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(`Efí: consulta ${endpoint} falhou (${res.status})`);
        }
        return data;
    }

    async getNotification(token: string): Promise<any> {
        return this.cobGet(`/v1/notification/${encodeURIComponent(token)}`);
    }

    async getCharge(chargeId: string): Promise<any> {
        const data = await this.cobGet(`/v1/charge/${encodeURIComponent(chargeId)}`);
        return data?.data ?? {};
    }

    async getPixCharge(txid: string): Promise<any> {
        const client = await this.httpClient();
        const token = await this.pixToken();

        const res = await fetch(`${this.pixBase}/v2/cob/${encodeURIComponent(txid)}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
            client,
        } as any);

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(`Efí: consulta da cobrança PIX falhou (${res.status})`);
        }
        return data;
    }
}

function extractTxid(body: any): string | null {
    if (typeof body?.txid === "string" && body.txid) return body.txid;
    const pixes = Array.isArray(body?.pix) ? body.pix : [];
    for (const pix of pixes) {
        if (typeof pix?.txid === "string" && pix.txid) return pix.txid;
    }
    return null;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    let rawBody = "";
    try {
        rawBody = await req.text();
    } catch {
        return json({ ok: false, error: "invalid body" }, 400);
    }

    let body: any = {};
    try {
        body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
        // A Efí pode enviar o token de notificação como form-urlencoded.
        body = Object.fromEntries(new URLSearchParams(rawBody).entries());
    }

    const txid = extractTxid(body);
    const notificationToken = body?.notification ? String(body.notification) : null;

    if (!txid && !notificationToken) {
        return json({ ok: true, ignored: "no txid/notification" });
    }

    const { data: gateway } = await admin
        .from("gateways")
        .select("id")
        .eq("slug", "efi")
        .maybeSingle();

    if (!gateway) {
        console.error("[efi-webhook] gateway efi não registrado");
        return json({ ok: false, error: "efi gateway missing" });
    }

    // Credencial ativa: 'live' tem prioridade sobre 'test'.
    const { data: credRows, error: credError } = await admin
        .from("gateway_credentials")
        .select("id, env, public_key, secret_key, webhook_secret, extra_config")
        .eq("gateway_id", gateway.id)
        .eq("is_active", true)
        .order("env", { ascending: true }) // 'live' < 'test'
        .limit(2);

    const cred = credRows?.find((c: any) => c.env === "live") ?? credRows?.[0];
    const clientId: string | undefined = cred?.public_key ?? undefined;
    const clientSecret: string | undefined = cred?.secret_key ?? undefined;

    if (credError || !clientId || !clientSecret) {
        console.error("[efi-webhook] credenciais ausentes/erro", credError);
        return json({ ok: false, error: "efi credentials not configured" });
    }

    // HMAC opcional na query string.
    const expectedHmac = String(cred?.webhook_secret || "").trim();
    if (expectedHmac) {
        const received = new URL(req.url).searchParams.get("hmac") || "";
        if (!timingSafeEqual(expectedHmac, received)) {
            console.error("[efi-webhook] HMAC inválido");
            return json({ ok: false, error: "invalid hmac" }, 401);
        }
    }

    const extra = cred?.extra_config ?? {};
    const api = new EfiApi({
        clientId,
        clientSecret,
        sandbox: cred?.env === "test",
        certificateP12: extra.certificate_p12,
        certificatePassword: extra.certificate_password,
    });

    let externalId = "";
    let internalStatus: InternalStatus = "pending";
    let statusText = "";
    let isRefund = false;
    let partialRefund = false;
    let amountCents = 0;
    let raw: any = null;
    let chargeCode = "";

    try {
        if (notificationToken) {
            // 1) token de notificação → charge_id; 2) reconsulta da cobrança.
            const notification = await api.getNotification(notificationToken);
            const entries = Array.isArray(notification?.data) ? notification.data : [];
            const last = entries.length > 0 ? entries[entries.length - 1] : null;
            const chargeId = String(last?.identifiers?.charge_id ?? "");
            if (!chargeId) {
                return json({ ok: true, ignored: "notification without charge_id" });
            }

            const charge = await api.getCharge(chargeId);
            externalId = chargeId;
            statusText = String(charge?.status || "");
            internalStatus = mapChargeStatus(statusText);
            isRefund = ["refunded", "contested"].includes(statusText.toLowerCase());
            amountCents = Number(charge?.total ?? 0);
            chargeCode = String(charge?.custom_id || "");
            raw = charge;
        } else if (txid) {
            const cob = await api.getPixCharge(txid);
            externalId = txid;
            statusText = String(cob?.status || "");
            internalStatus = mapPixStatus(statusText);
            amountCents = Math.round(Number(cob?.valor?.original ?? 0) * 100);
            raw = cob;

            if (internalStatus === "paid") {
                const refund = pixRefund(cob);
                partialRefund = refund.hasRefund && !refund.isFullRefund;
                if (refund.isFullRefund) {
                    internalStatus = "failed";
                    isRefund = true;
                }
            }
        }
    } catch (err) {
        console.error("[efi-webhook] falha ao reconsultar a cobrança", err);
        // 5xx faz a Efí reenviar a notificação.
        return json({ ok: false, error: "lookup failed" }, 500);
    }

    if (!externalId) {
        return json({ ok: true, ignored: "no external id" });
    }

    // -------------------------------------------------------------------------
    // Vínculo com o pedido
    // -------------------------------------------------------------------------
    let orderId: string | undefined;

    const { data: paymentByExternal } = await admin
        .from("payments")
        .select("id, order_id")
        .eq("external_payment_id", externalId)
        .maybeSingle();
    orderId = paymentByExternal?.order_id ?? undefined;

    if (!orderId) {
        const { data: byExternal } = await admin
            .from("orders")
            .select("id")
            .eq("external_id", externalId)
            .maybeSingle();
        orderId = byExternal?.id ?? undefined;
    }

    if (!orderId && chargeCode) {
        const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidLike.test(chargeCode)) {
            const { data: byCode } = await admin
                .from("orders")
                .select("id")
                .eq("id", chargeCode)
                .maybeSingle();
            orderId = byCode?.id ?? undefined;
        }
    }

    if (!orderId) {
        console.error("[efi-webhook] pedido não encontrado", { externalId });
        return json({ ok: true, ignored: "order not found" });
    }

    const { data: order, error: orderError } = await admin
        .from("orders")
        .select("id, user_id, status")
        .eq("id", orderId)
        .maybeSingle();

    if (orderError || !order) {
        console.error("[efi-webhook] erro ao buscar pedido", { orderId, orderError });
        return json({ ok: true, ignored: "order not found" });
    }

    if (partialRefund) {
        if (paymentByExternal?.id) {
            await admin
                .from("payments")
                .update({ status: "refunded", error_message: "Estorno parcial no Efí" })
                .eq("id", paymentByExternal.id);
        }
        return json({ ok: true, orderId, info: "partial refund" });
    }

    // Idempotência.
    if (order.status === "paid" && internalStatus === "paid") {
        return json({ ok: true, ignored: "already paid" });
    }
    if (order.status === "failed" && internalStatus === "failed") {
        return json({ ok: true, ignored: "already failed" });
    }

    // Nunca rebaixa pedido pago, exceto em estorno.
    if (order.status === "paid" && internalStatus === "pending") {
        return json({ ok: true, ignored: "paid order, pending event" });
    }
    if (order.status === "paid" && internalStatus === "failed" && !isRefund) {
        return json({ ok: true, ignored: "paid order, non-refund failure event" });
    }

    const paidAt = internalStatus === "paid" ? new Date().toISOString() : null;
    const orderUpdate: Record<string, any> = {
        status: internalStatus,
        external_id: externalId,
    };
    if (paidAt) orderUpdate.paid_at = paidAt;
    if (internalStatus === "failed") {
        orderUpdate.error_message = isRefund ? "Pagamento estornado no Efí" : (statusText || "Cobrança não paga");
    }

    const { error: updateError } = await admin
        .from("orders")
        .update(orderUpdate)
        .eq("id", order.id);

    if (updateError) {
        console.error("[efi-webhook] erro ao atualizar pedido", updateError);
        return json({ ok: false, error: "order update failed" }, 500);
    }

    if (paymentByExternal?.id) {
        await admin
            .from("payments")
            .update({
                status: internalStatus,
                paid_at: paidAt,
                error_message: internalStatus === "failed"
                    ? (isRefund ? "Pagamento estornado no Efí" : statusText)
                    : null,
            })
            .eq("id", paymentByExternal.id);
    } else {
        await admin.from("payments").insert({
            order_id: order.id,
            gateway_id: gateway.id,
            external_payment_id: externalId,
            status: internalStatus,
            amount: amountCents,
            currency: "BRL",
            payment_method_type: /^\d+$/.test(externalId) ? "charge" : "pix",
            raw_response: raw ?? null,
            paid_at: paidAt,
        });
    }

    // -------------------------------------------------------------------------
    // Acesso ao curso
    // -------------------------------------------------------------------------
    const { data: items } = await admin
        .from("order_items")
        .select("product_id, products:product_id(course_id)")
        .eq("order_id", order.id);

    const courseIds = new Set<string>();
    for (const item of items ?? []) {
        const courseId = (item.products as any)?.course_id;
        if (courseId) courseIds.add(courseId);
    }

    if (internalStatus === "paid" && order.user_id) {
        for (const courseId of courseIds) {
            const { error } = await admin.from("user_course_access").upsert(
                {
                    user_id: order.user_id,
                    course_id: courseId,
                    source: "checkout",
                    granted_by: null,
                },
                { onConflict: "user_id,course_id", ignoreDuplicates: true },
            );
            if (error) {
                console.error("[efi-webhook] erro ao liberar acesso", { courseId, error });
            }
        }
    }

    // Estorno: revoga o acesso se não houver outra compra paga.
    if (internalStatus === "failed" && order.user_id && isRefund) {
        for (const courseId of courseIds) {
            const { data: otherPaid } = await admin
                .from("order_items")
                .select("order_id, orders!inner(id, user_id, status), products!inner(course_id)")
                .eq("products.course_id", courseId)
                .eq("orders.user_id", order.user_id)
                .eq("orders.status", "paid")
                .neq("order_id", order.id)
                .limit(1);

            if (!otherPaid || otherPaid.length === 0) {
                await admin
                    .from("user_course_access")
                    .delete()
                    .eq("user_id", order.user_id)
                    .eq("course_id", courseId)
                    .eq("source", "checkout");
            }
        }
    }

    return json({
        ok: true,
        orderId: order.id,
        efiStatus: statusText,
        status: internalStatus,
    });
});
