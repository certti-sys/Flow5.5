import { logger } from "./logger.ts";
import {
    type DeliveryContext,
    type Integration,
    type OrderPayload,
    sendIntegrationEvent,
} from "./integrations.ts";

/**
 * Entrega da fila de integrações de marketing (`integration_deliveries`).
 *
 * Mesmo desenho do webhook de saída: a linha é gravada por trigger no banco, a
 * entrega é durável e o cron retenta. A diferença é que aqui o destino é uma
 * API fixa (UTMfy, Meta, Spedy) e não uma URL do usuário — não há assinatura
 * HMAC, há credencial por linha.
 *
 * Nunca lança: integração de marketing não pode desfazer pagamento.
 */

const CONCURRENCY = 3;

type Delivery = {
    id: string;
    integration_id: string;
    order_id: string | null;
    event: string;
    payload: OrderPayload;
    context: DeliveryContext | null;
    attempt: number;
    max_attempts: number;
};

/** 30s, 2min, 8min, 30min, 2h. */
function nextAttemptDelay(attempt: number): number {
    return Math.min(30 * Math.pow(4, attempt - 1), 7200) * 1000;
}

export async function dispatchPendingIntegrations(
    supabase: any,
    limit = 50,
): Promise<{ sent: number; failed: number; pending: number }> {
    let sent = 0;
    let failed = 0;

    try {
        const { data: rows, error } = await supabase
            .from("integration_deliveries")
            .select("id, integration_id, order_id, event, payload, context, attempt, max_attempts")
            .eq("status", "pending")
            .lte("next_attempt_at", new Date().toISOString())
            .order("next_attempt_at", { ascending: true })
            .limit(limit);

        if (error) {
            logger.error("[integrations] falha ao ler fila", error);
            return { sent, failed, pending: 0 };
        }
        if (!rows || rows.length === 0) return { sent, failed, pending: 0 };

        const ids = [...new Set(rows.map((r: Delivery) => r.integration_id))];
        // `secret` só existe aqui: o grant de coluna esconde do cliente, mas o
        // service role lê tudo.
        const { data: integrations } = await supabase
            .from("integrations")
            .select("id, kind, config, secret, is_active")
            .in("id", ids);

        const byId = new Map<string, Integration & { is_active: boolean }>(
            (integrations ?? []).map((i: any) => [i.id, i]),
        );

        for (let i = 0; i < rows.length; i += CONCURRENCY) {
            const batch: Delivery[] = rows.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(async (delivery) => {
                const integration = byId.get(delivery.integration_id);
                const attempt = delivery.attempt + 1;

                const close = (
                    status: "sent" | "failed" | "skipped",
                    patch: Record<string, unknown> = {},
                ) => {
                    if (status === "sent") sent++;
                    if (status === "failed") failed++;
                    return supabase
                        .from("integration_deliveries")
                        .update({
                            attempt,
                            status,
                            ...(status === "sent" ? { delivered_at: new Date().toISOString() } : {}),
                            ...patch,
                        })
                        .eq("id", delivery.id);
                };

                // Integração removida ou desligada entre o enfileiramento e o
                // envio: encerra sem tentar, senão a linha fica pendente para
                // sempre.
                if (!integration || !integration.is_active) {
                    await close("skipped", { error: "integração inativa ou removida" });
                    return;
                }

                const result = await sendIntegrationEvent(
                    integration,
                    delivery.payload,
                    delivery.event,
                    delivery.context ?? {},
                );

                if (result.outcome === "ok") {
                    await close("sent", {
                        response_status: result.status ?? null,
                        response_body: result.body ?? null,
                        error: null,
                    });
                    return;
                }

                if (result.outcome === "skip") {
                    // Credencial errada não melhora com retry, e o painel
                    // mostra o motivo em `last_error`.
                    await supabase
                        .from("integrations")
                        .update({ last_error: result.error ?? "falha definitiva" })
                        .eq("id", integration.id);
                    await close("skipped", {
                        response_status: result.status ?? null,
                        response_body: result.body ?? null,
                        error: result.error ?? "falha definitiva",
                    });
                    return;
                }

                if (attempt >= delivery.max_attempts) {
                    await supabase
                        .from("integrations")
                        .update({ last_error: result.error ?? `HTTP ${result.status}` })
                        .eq("id", integration.id);
                    await close("failed", {
                        response_status: result.status ?? null,
                        response_body: result.body ?? null,
                        error: result.error ?? `HTTP ${result.status}`,
                    });
                    return;
                }

                await supabase
                    .from("integration_deliveries")
                    .update({
                        attempt,
                        response_status: result.status ?? null,
                        response_body: result.body ?? null,
                        error: result.error ?? `HTTP ${result.status}`,
                        next_attempt_at: new Date(Date.now() + nextAttemptDelay(attempt)).toISOString(),
                    })
                    .eq("id", delivery.id);
            }));
        }
    } catch (err) {
        logger.error("[integrations] erro inesperado", err);
    }

    const { count } = await supabase
        .from("integration_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lte("next_attempt_at", new Date().toISOString());

    return { sent, failed, pending: count ?? 0 };
}

/**
 * Drena em background sem segurar a resposta do gateway.
 *
 * Mesmo motivo do webhook: o PSP não pode esperar a UTMfy. Cobre 3 passadas; o
 * resto fica para o cron de minuto.
 */
export function scheduleIntegrationDispatch(supabase: any): void {
    const runtime = (globalThis as any).EdgeRuntime;
    if (!runtime?.waitUntil) return;

    runtime.waitUntil((async () => {
        for (let pass = 0; pass < 3; pass++) {
            const { pending } = await dispatchPendingIntegrations(supabase);
            if (pending === 0) break;
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    })().catch((err: unknown) => {
        logger.warn("[integrations] drenagem em background falhou", err);
    }));
}
