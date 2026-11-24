import { logger } from "./logger.ts";
import { sendPushToUser } from "./push-dispatch.ts";

/**
 * Entrega das notificações internas (WhatsApp e Web Push).
 *
 * A fila é `notification_deliveries`: uma linha por aviso/destinatário/canal,
 * criada pelo trigger `enqueue_notification_deliveries`. Diferente dos webhooks,
 * o envio só faz sentido enquanto o aviso está no ar — aviso agendado não sai
 * antes de `publish_at`, aviso expirado não sai.
 *
 * Cada canal tem seu motivo de falha: o WhatsApp responde 429 (rate limit de 5
 * mensagens/hora por número), o push responde 410 quando a inscrição daquele
 * aparelho morreu. Ambos são tratados por canal, e o `channel` da linha decide
 * o ramo — é por isso que a chave da fila inclui o canal.
 *
 * Nunca lança: aviso interno não pode derrubar o fluxo que o criou.
 */

const MAX_ATTEMPTS = 5;
const CONCURRENCY = 3;
const TIMEOUT_MS = 15_000;

type Delivery = {
    id: string;
    notification_id: string;
    user_id: string;
    channel: "whatsapp" | "push";
    phone: string | null;
    attempts: number;
};

type Notification = {
    id: string;
    title: string;
    message: string;
    link: string | null;
    publish_at: string;
    expires_at: string | null;
    send_whatsapp: boolean;
    send_push: boolean;
};

/** 2min, 8min, 30min, 2h — o 429/5xx some sozinho, não precisa de mais. */
function nextAttemptDelay(attempt: number): number {
    return Math.min(120 * Math.pow(4, attempt - 1), 7200) * 1000;
}

function renderMessage(notification: Notification, siteUrl: string): string {
    const body = [`*${notification.title}*`, "", notification.message];
    if (notification.link && /^https?:\/\//i.test(notification.link)) {
        body.push("", notification.link);
    } else if (notification.link) {
        body.push("", `${siteUrl}${notification.link.startsWith("/") ? "" : "/"}${notification.link}`);
    }
    return body.join("\n");
}

export async function dispatchPendingNotifications(
    supabase: any,
    limit = 25,
): Promise<{ sent: number; failed: number; pending: number }> {
    let sent = 0;
    let failed = 0;

    try {
        const { data: rows, error } = await supabase
            .from("notification_deliveries")
            .select("id, notification_id, user_id, channel, phone, attempts")
            .eq("status", "pending")
            .lte("next_attempt_at", new Date().toISOString())
            .order("next_attempt_at", { ascending: true })
            .limit(limit);

        if (error) {
            logger.error("[notification-dispatch] falha ao ler fila", error);
            return { sent, failed, pending: 0 };
        }
        if (!rows || rows.length === 0) return { sent, failed, pending: 0 };

        const ids = [...new Set(rows.map((r: Delivery) => r.notification_id))];
        const { data: notifications } = await supabase
            .from("notifications")
            .select("id, title, message, link, publish_at, expires_at, send_whatsapp, send_push")
            .in("id", ids);

        const byId = new Map<string, Notification>(
            (notifications ?? []).map((n: Notification) => [n.id, n]),
        );

        const now = Date.now();
        const siteUrl = (Deno.env.get("SITE_URL") || "https://v5.flowmembers.app").replace(/\/$/, "");

        for (let i = 0; i < rows.length; i += CONCURRENCY) {
            const batch: Delivery[] = rows.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(async (delivery) => {
                const notification = byId.get(delivery.notification_id);
                const patch: Record<string, unknown> = { attempts: delivery.attempts + 1 };

                const channelOn = notification &&
                    (delivery.channel === "push" ? notification.send_push : notification.send_whatsapp);
                const expired = notification?.expires_at
                    ? new Date(notification.expires_at).getTime() <= now
                    : false;

                // Aviso removido, canal desligado ou já vencido: encerra sem
                // tentar. Deixar pendente faria a fila crescer para sempre.
                if (!channelOn || expired) {
                    await supabase
                        .from("notification_deliveries")
                        .update({ ...patch, status: "skipped", last_error: expired ? "aviso expirado" : "aviso removido" })
                        .eq("id", delivery.id);
                    return;
                }

                // Agendado: a linha existe desde o insert, mas só deve sair em
                // `publish_at`. Adiar sem gastar tentativa; senão o cron
                // queimaria as 5 tentativas antes do dia do aviso.
                const publishAt = new Date(notification.publish_at).getTime();
                if (publishAt > now) {
                    await supabase
                        .from("notification_deliveries")
                        .update({
                            ...patch,
                            attempts: delivery.attempts,
                            next_attempt_at: new Date(publishAt).toISOString(),
                        })
                        .eq("id", delivery.id);
                    return;
                }

                const done = (status: "sent" | "failed" | "skipped", lastError: string | null) => {
                    if (status === "sent") sent++;
                    if (status === "failed") failed++;
                    return supabase
                        .from("notification_deliveries")
                        .update({
                            ...patch,
                            status,
                            last_error: lastError,
                            ...(status === "sent" ? { sent_at: new Date().toISOString() } : {}),
                        })
                        .eq("id", delivery.id);
                };

                const retryLater = (lastError: string, attempts = delivery.attempts + 1) => {
                    if (attempts >= MAX_ATTEMPTS) return done("failed", lastError);
                    return supabase
                        .from("notification_deliveries")
                        .update({
                            ...patch,
                            last_error: lastError,
                            next_attempt_at: new Date(Date.now() + nextAttemptDelay(attempts)).toISOString(),
                        })
                        .eq("id", delivery.id);
                };

                if (delivery.channel === "push") {
                    const outcome = await sendPushToUser(supabase, delivery.user_id, {
                        title: notification.title,
                        body: notification.message,
                        url: notification.link,
                        tag: notification.id,
                    });

                    if (outcome === "sent") return done("sent", null);
                    // Sem inscrição (ou todas mortas): insistir não cria aparelho.
                    if (outcome === "gone") return done("skipped", "sem inscrição push ativa");
                    return retryLater(outcome === "retry" ? "push temporariamente indisponível" : "push falhou");
                }

                if (!delivery.phone) return done("skipped", "sem telefone");

                let status: number | null = null;
                let errorText: string | null = null;

                try {
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
                    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                        },
                        body: JSON.stringify({
                            phone: delivery.phone,
                            message: renderMessage(notification, siteUrl),
                        }),
                        signal: controller.signal,
                    });
                    clearTimeout(timer);
                    status = res.status;
                    if (!res.ok) errorText = (await res.text()).slice(0, 300);
                } catch (err) {
                    errorText = err instanceof Error ? err.message : String(err);
                }

                const ok = status !== null && status >= 200 && status < 300;
                if (ok) return done("sent", null);
                return retryLater(errorText ?? `HTTP ${status}`);
            }));
        }
    } catch (err) {
        logger.error("[notification-dispatch] erro inesperado", err);
    }

    const { count } = await supabase
        .from("notification_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lte("next_attempt_at", new Date().toISOString());

    return { sent, failed, pending: count ?? 0 };
}

/**
 * Drena em background sem segurar a resposta.
 *
 * Mesmo motivo do webhook: o admin que salva o aviso não deve esperar o envio.
 * `EdgeRuntime.waitUntil` cobre 3 passadas; o que sobrar fica para o cron de
 * minuto.
 */
export function scheduleNotificationDispatch(supabase: any): void {
    const runtime = (globalThis as any).EdgeRuntime;
    if (!runtime?.waitUntil) return;

    runtime.waitUntil((async () => {
        for (let pass = 0; pass < 3; pass++) {
            const { pending } = await dispatchPendingNotifications(supabase);
            if (pending === 0) break;
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    })().catch((err: unknown) => {
        logger.warn("[notification-dispatch] drenagem em background falhou", err);
    }));
}
