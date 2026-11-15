import {
    ApplicationServer,
    importVapidKeys,
} from "https://esm.sh/jsr/@negrel/webpush@0.5.0";
import { logger } from "./logger.ts";

/**
 * Envio de Web Push (RFC 8030 + 8291) para as inscrições de um usuário.
 *
 * A fila (`notification_deliveries`, canal `push`) é por usuário, não por
 * inscrição: a mesma pessoa pode ter celular e desktop, e a linha da fila só é
 * marcada como enviada quando todos os aparelhos responderam. Endpoint que
 * responde 404/410 está morto e é removido na hora — senão a fila tentaria
 * para sempre e o `failure_count` cresceria sem limite.
 *
 * Chaves VAPID em secret (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_JWK`). A privada é
 * JWK porque o `crypto.subtle` do Deno importa ECDSA direto do JWK; converter
 * de base64url exigiria remontar x/y/d na mão.
 *
 * Nunca lança.
 */

export type PushOutcome = "sent" | "gone" | "retry" | "failed";

type Subscription = {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
};

type Payload = {
    title: string;
    body: string;
    /** Caminho relativo; o service worker resolve contra a origem. */
    url?: string | null;
    tag?: string;
};

let appServer: ApplicationServer | null = null;

async function getAppServer(): Promise<ApplicationServer | null> {
    if (appServer) return appServer;

    const privateJwk = Deno.env.get("VAPID_PRIVATE_JWK");
    if (!privateJwk) {
        logger.warn("[push] VAPID_PRIVATE_JWK ausente; push desligado");
        return null;
    }

    try {
        const parsed = JSON.parse(privateJwk);
        const vapidKeys = await importVapidKeys({
            publicKey: { kty: "EC", crv: "P-256", x: parsed.x, y: parsed.y, key_ops: ["verify"], ext: true },
            privateKey: { ...parsed, key_ops: ["sign"], ext: true },
        });

        appServer = await ApplicationServer.new({
            contactInformation: Deno.env.get("VAPID_SUBJECT") || "mailto:suporte@flowmembers.app",
            vapidKeys,
        });
        return appServer;
    } catch (err) {
        logger.error("[push] falha ao montar VAPID", err);
        return null;
    }
}

/** Um aparelho por vez: um endpoint lento não atrasa os outros. */
async function sendToSubscription(
    server: ApplicationServer,
    subscription: Subscription,
    payload: Payload,
): Promise<PushOutcome> {
    try {
        const subscriber = server.subscribe({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        });

        await subscriber.pushTextMessage(JSON.stringify(payload), { ttl: 3600 });

        // 410 é o único sinal definitivo de inscrição morta.
        if (subscriber.isGone?.()) return "gone";
        return "sent";
    } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404 || status === 410) return "gone";
        // 429 e 5xx do serviço de push são temporários.
        if (!status || status === 429 || status >= 500) return "retry";
        logger.warn("[push] falha definitiva", { status, endpoint: subscription.endpoint.slice(0, 60) });
        return "failed";
    }
}

export async function sendPushToUser(
    supabase: any,
    userId: string,
    payload: Payload,
): Promise<PushOutcome> {
    const server = await getAppServer();
    if (!server) return "retry";

    const { data, error } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", userId);

    if (error) {
        logger.error("[push] falha ao ler inscrições", error);
        return "retry";
    }

    // Sem aparelho inscrito não há o que retentar: o usuário nunca vai receber
    // este aviso, e insistir só ocuparia a fila.
    if (!data || data.length === 0) return "gone";

    const results = await Promise.all(
        (data as Subscription[]).map((s) => sendToSubscription(server, s, payload)),
    );

    const gone = data.filter((_: unknown, i: number) => results[i] === "gone");
    if (gone.length > 0) {
        await supabase
            .from("push_subscriptions")
            .delete()
            .in("id", gone.map((s: Subscription) => s.id));
    }

    const delivered = results.filter((r) => r === "sent").length;
    if (delivered > 0) {
        await supabase
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString(), failure_count: 0 })
            .in("id", data.filter((_: unknown, i: number) => results[i] === "sent").map((s: Subscription) => s.id));
        return "sent";
    }

    if (results.some((r) => r === "retry")) return "retry";
    return gone.length === data.length ? "gone" : "failed";
}
