import { logger } from "./logger.ts";
import { deliverEmail, isTypeEnabled, loadEmailSettings, renderEmail, type EmailType } from "./email.ts";

/**
 * Fila durável de e-mail (`email_logs.status = 'queued'`).
 *
 * O envio direto perdia e-mail quando o Brevo caía — inclusive o de
 * boas-vindas, que carrega a senha temporária. Aqui o chamador só grava a
 * intenção; `dispatch-notifications` drena no minuto seguinte e reencontra o
 * que faltou nas próximas rodadas.
 *
 * Backoff igual ao da fila de notificações (2min → 2h, 5 tentativas): falha
 * transitória de provedor some sozinha, e o que não some vira `failed` visível
 * no painel em vez de silêncio.
 */

const MAX_ATTEMPTS = 5;
const CONCURRENCY = 3;

/**
 * Tipos que respeitam descadastro. `custom` entra porque é o tipo dos avisos de
 * marketing (recuperação de carrinho); senha, acesso e boas-vindas ficam de fora
 * de propósito — barrar esses trancaria o aluno fora da própria conta.
 */
const OPTOUT_TYPES = new Set<EmailType>(["custom", "notification", "streak_at_risk"]);

function nextAttemptDelay(attempt: number): number {
    return Math.min(120 * Math.pow(4, attempt - 1), 7200) * 1000;
}

/**
 * Grava o descadastro quando o provedor diz que o endereço está morto
 * (hard bounce) ou que o contato saiu da lista. Sem isso o mesmo endereço
 * volta na próxima campanha e o domínio perde reputação à toa.
 *
 * Nunca lança: é efeito colateral do envio.
 */
export async function recordOptOut(supabase: any, email: string, reason: string): Promise<void> {
    const normalized = (email ?? "").trim().toLowerCase();
    if (!normalized) return;
    const { error } = await supabase
        .from("email_opt_outs")
        .upsert(
            { email: normalized, reason: reason.slice(0, 500), source: "bounce" },
            { onConflict: "email", ignoreDuplicates: true },
        );
    if (error) logger.warn("[email-queue] falha ao registrar opt-out", { email: normalized, error: error.message });
}

export type EnqueueEmailInput = {
    to: string;
    toName?: string | null;
    type: EmailType;
    subject?: string;
    html?: string;
    variables?: Record<string, string>;
    /** Origem do disparo, só para diagnóstico no painel. */
    source?: string;
};

/**
 * Grava o e-mail na fila. Devolve `false` quando o tipo está desligado pelo
 * admin — nesse caso nem a linha é criada, para o log não virar lixo.
 *
 * Nunca lança: e-mail é efeito colateral e não pode derrubar o fluxo que o
 * originou (mesma regra de `notifyOrderPaid`).
 */
export async function enqueueEmail(supabase: any, input: EnqueueEmailInput): Promise<boolean> {
    try {
        const settings = await loadEmailSettings(supabase);
        if (!settings) {
            logger.warn("[email-queue] email_settings inativo; e-mail descartado", { type: input.type });
            return false;
        }
        if (!isTypeEnabled(settings, input.type)) {
            logger.info(`[email-queue] tipo ${input.type} desligado pelo admin; ignorado`);
            return false;
        }

        // Descadastro vale para tudo que é comunicação de marketing/relacionamento.
        // Transacional (senha, acesso, recibo) continua saindo: bloquear isso
        // trancaria o aluno fora da própria conta.
        if (OPTOUT_TYPES.has(input.type)) {
            const { data: optOut } = await supabase
                .from("email_opt_outs")
                .select("email")
                .eq("email", input.to.toLowerCase())
                .maybeSingle();
            if (optOut) {
                logger.info("[email-queue] destinatário descadastrado; ignorado", { type: input.type });
                return false;
            }
        }

        const { error } = await supabase.from("email_logs").insert({
            recipient_email: input.to,
            recipient_name: input.toName ?? null,
            // O assunto final depende do template; o preview fica no metadata
            // para a linha da fila não mentir no painel.
            subject: input.subject ?? "",
            email_type: input.type,
            provider: settings.provider,
            status: "queued",
            metadata: {
                variables: input.variables ?? {},
                html: input.html ?? null,
                source: input.source ?? null,
            },
        });

        if (error) {
            logger.error("[email-queue] falha ao enfileirar", error);
            return false;
        }
        return true;
    } catch (error) {
        logger.error("[email-queue] erro inesperado ao enfileirar", error);
        return false;
    }
}

export async function dispatchPendingEmails(
    supabase: any,
    limit = 25,
): Promise<{ sent: number; failed: number; pending: number }> {
    let sent = 0;
    let failed = 0;

    try {
        const { data: rows, error } = await supabase
            .from("email_logs")
            .select("id, recipient_email, recipient_name, subject, email_type, attempts, metadata")
            .eq("status", "queued")
            .lte("next_attempt_at", new Date().toISOString())
            .order("next_attempt_at", { ascending: true })
            .limit(limit);

        if (error) {
            logger.error("[email-queue] falha ao ler fila", error);
            return { sent, failed, pending: 0 };
        }
        if (!rows || rows.length === 0) return { sent, failed, pending: 0 };

        const settings = await loadEmailSettings(supabase);
        if (!settings) {
            logger.warn("[email-queue] email_settings inativo; fila parada");
            return { sent, failed, pending: rows.length };
        }

        const { data: platform } = await supabase
            .from("platform_settings")
            .select("*")
            .eq("is_active", true)
            .single();

        for (let i = 0; i < rows.length; i += CONCURRENCY) {
            const batch = rows.slice(i, i + CONCURRENCY);

            await Promise.all(batch.map(async (row: any) => {
                const attempts = (row.attempts ?? 0) + 1;
                const meta = row.metadata ?? {};

                const rendered = renderEmail(settings, platform, {
                    type: row.email_type as EmailType,
                    subject: row.subject || undefined,
                    html: meta.html ?? undefined,
                    variables: meta.variables ?? {},
                });

                const result = await deliverEmail(settings, {
                    to: row.recipient_email,
                    toName: row.recipient_name ?? undefined,
                    subject: rendered.subject,
                    html: rendered.html,
                });

                if (result.success) {
                    sent++;
                    await supabase
                        .from("email_logs")
                        .update({
                            status: "sent",
                            attempts,
                            sent_at: new Date().toISOString(),
                            subject: rendered.subject,
                            error_message: null,
                        })
                        .eq("id", row.id);
                    return;
                }

                // Bloqueio do Brevo e chave ausente não melhoram com o tempo.
                if (result.permanent || attempts >= MAX_ATTEMPTS) {
                    failed++;
                    await supabase
                        .from("email_logs")
                        .update({
                            status: "failed",
                            attempts,
                            subject: rendered.subject,
                            error_message: result.error ?? "falha no envio",
                        })
                        .eq("id", row.id);
                    // Endereço morto/descadastrado sai da lista aqui, não na
                    // próxima campanha.
                    if (result.optOut) {
                        await recordOptOut(supabase, row.recipient_email, result.error ?? "hard bounce");
                    }
                    return;
                }

                await supabase
                    .from("email_logs")
                    .update({
                        attempts,
                        subject: rendered.subject,
                        error_message: result.error ?? "falha no envio",
                        next_attempt_at: new Date(Date.now() + nextAttemptDelay(attempts)).toISOString(),
                    })
                    .eq("id", row.id);
            }));
        }
    } catch (err) {
        logger.error("[email-queue] erro inesperado na drenagem", err);
    }

    const { count } = await supabase
        .from("email_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "queued");

    return { sent, failed, pending: count ?? 0 };
}
