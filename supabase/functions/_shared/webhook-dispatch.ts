import { logger } from "./logger.ts";

/**
 * Entrega de webhooks de saída.
 *
 * A fila vive em `webhook_deliveries` (gravada por trigger em `orders`), então
 * a entrega é durável: se a function estiver fora no momento da venda, a linha
 * continua `pending` e é retentada depois.
 *
 * Assinatura: `X-Flow-Signature: t=<unix>,v1=<hex>`, onde o hex é
 * HMAC-SHA256 de `${t}.${corpoBruto}`. O destinatário deve comparar em tempo
 * constante e rejeitar `t` com mais de 5 minutos.
 *
 * Nunca lança: integração de saída não pode desfazer a confirmação de
 * pagamento (mesma regra do trigger `grant_order_access`).
 */

const MAX_RESPONSE_BODY = 2000;
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 5;

type Delivery = {
    id: string;
    endpoint_id: string;
    event: string;
    payload: unknown;
    attempt: number;
    max_attempts: number;
};

type Endpoint = {
    id: string;
    url: string;
    secret: string;
    bearer_token: string | null;
    is_active: boolean;
};

function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

export async function signPayload(secret: string, timestamp: number, body: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
    return `t=${timestamp},v1=${toHex(signature)}`;
}

/** Backoff exponencial: 30s, 2min, 8min, 30min, 2h. */
function nextAttemptDelay(attempt: number): number {
    return Math.min(30 * Math.pow(4, attempt - 1), 7200) * 1000;
}

async function deliver(
    supabase: any,
    delivery: Delivery,
    endpoint: Endpoint,
): Promise<boolean> {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
        id: delivery.id,
        event: delivery.event,
        created_at: new Date().toISOString(),
        data: delivery.payload,
    });
    const attempt = delivery.attempt + 1;
    const patch: Record<string, unknown> = { attempt };

    let status: number | null = null;
    let responseBody = "";
    let error: string | null = null;

    try {
        const signature = await signPayload(endpoint.secret, timestamp, body);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const res = await fetch(endpoint.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Flow-Webhooks/1",
                ...(endpoint.bearer_token
                    ? { Authorization: `Bearer ${endpoint.bearer_token}` }
                    : {}),
                "X-Flow-Signature": signature,
                "X-Flow-Event": delivery.event,
                "X-Flow-Delivery": delivery.id,
                "X-Flow-Attempt": String(attempt),
            },
            body,
            signal: controller.signal,
        });
        clearTimeout(timer);

        status = res.status;
        responseBody = (await res.text()).slice(0, MAX_RESPONSE_BODY);
    } catch (err) {
        error = err instanceof Error ? err.message : String(err);
    }

    const ok = status !== null && status >= 200 && status < 300;

    if (ok) {
        Object.assign(patch, {
            status: "delivered",
            response_status: status,
            response_body: responseBody,
            error: null,
            delivered_at: new Date().toISOString(),
        });
    } else if (attempt >= delivery.max_attempts) {
        Object.assign(patch, {
            status: "failed",
            response_status: status,
            response_body: responseBody,
            error: error ?? `HTTP ${status}`,
        });
    } else {
        Object.assign(patch, {
            response_status: status,
            response_body: responseBody,
            error: error ?? `HTTP ${status}`,
            next_attempt_at: new Date(Date.now() + nextAttemptDelay(attempt)).toISOString(),
        });
    }

    const { error: updateError } = await supabase
        .from("webhook_deliveries")
        .update(patch)
        .eq("id", delivery.id);

    if (updateError) {
        logger.error("[webhook-dispatch] falha ao gravar resultado da entrega", updateError);
    }

    return ok;
}

/**
 * Drena entregas pendentes vencidas.
 *
 * @returns quantas foram entregues, quantas falharam e quantas continuam
 *          pendentes (`pending` = ainda há trabalho para a próxima passada).
 */
export async function dispatchPendingWebhooks(
    supabase: any,
    limit = 50,
): Promise<{ delivered: number; failed: number; pending: number }> {
    let delivered = 0;
    let failed = 0;

    try {
        const now = new Date().toISOString();
        const { data: rows, error } = await supabase
            .from("webhook_deliveries")
            .select("id, endpoint_id, event, payload, attempt, max_attempts")
            .eq("status", "pending")
            .lte("next_attempt_at", now)
            .order("next_attempt_at", { ascending: true })
            .limit(limit);

        if (error) {
            logger.error("[webhook-dispatch] falha ao ler fila", error);
            return { delivered, failed, pending: 0 };
        }
        if (!rows || rows.length === 0) return { delivered, failed, pending: 0 };

        const endpointIds = [...new Set(rows.map((r: Delivery) => r.endpoint_id))];
        const { data: endpoints } = await supabase
            .from("webhook_endpoints")
            .select("id, url, secret, bearer_token, is_active")
            .in("id", endpointIds);

        const byId = new Map<string, Endpoint>((endpoints ?? []).map((e: Endpoint) => [e.id, e]));

        for (let i = 0; i < rows.length; i += CONCURRENCY) {
            const batch = rows.slice(i, i + CONCURRENCY);
            const results = await Promise.all(batch.map(async (delivery: Delivery) => {
                const endpoint = byId.get(delivery.endpoint_id);
                if (!endpoint || !endpoint.is_active) {
                    // Endpoint removido/desativado: encerra sem tentar, senão a
                    // linha fica pendente para sempre.
                    await supabase
                        .from("webhook_deliveries")
                        .update({ status: "failed", error: "endpoint inativo ou removido" })
                        .eq("id", delivery.id);
                    return false;
                }
                return deliver(supabase, delivery, endpoint);
            }));
            for (const ok of results) ok ? delivered++ : failed++;
        }
    } catch (err) {
        logger.error("[webhook-dispatch] erro inesperado", err);
    }

    // Sobrou pendente **vencido** (backoff futuro não conta)? Então há trabalho.
    const { count } = await supabase
        .from("webhook_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lte("next_attempt_at", new Date().toISOString());

    return { delivered, failed, pending: count ?? 0 };
}

/**
 * Agenda a drenagem sem bloquear a resposta ao PSP.
 *
 * O webhook do gateway precisa responder rápido, senão o PSP considera
 * timeout e reenvia o mesmo evento. `EdgeRuntime.waitUntil` mantém a execução
 * viva depois do `Response` sair.
 *
 * Faz até 3 passadas com 5s de intervalo: cobre destino reiniciando, que é o
 * caso realista. O que sobrar fica na fila com backoff exponencial (30s → 2h)
 * e é drenado pela próxima chamada ou pelo `dispatch-webhooks` agendado.
 */
export function scheduleWebhookDispatch(supabase: any): void {
    const runtime = (globalThis as any).EdgeRuntime;
    if (!runtime?.waitUntil) return;

    runtime.waitUntil((async () => {
        for (let pass = 0; pass < 3; pass++) {
            const { pending } = await dispatchPendingWebhooks(supabase);
            if (pending === 0) break;
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    })().catch((err: unknown) => {
        logger.warn("[webhook-dispatch] drenagem em background falhou", err);
    }));
}
