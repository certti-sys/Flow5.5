import { logger } from "./logger.ts";

/**
 * Notificações de WhatsApp do fluxo de compra.
 *
 * Os 8 webhooks de gateway marcam `orders.status = 'paid'` cada um no seu
 * formato; em vez de repetir a lógica de destinatários e variáveis em cada um,
 * todos chamam este helper depois da transição.
 *
 * Nunca lança: notificação é conveniência e não pode desfazer a confirmação de
 * pagamento (mesma regra do trigger `grant_order_access`).
 */

type OrderRow = {
    id: string;
    user_id: string | null;
    status: string;
    currency: string | null;
    total_amount: number | null;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
};

function formatBRL(amountInCents: number | null, currency: string | null): string {
    const value = (amountInCents ?? 0) / 100;
    return value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) + (currency === "USD" ? " USD" : "");
}

export async function notifyOrderPaid(supabase: any, orderId: string): Promise<void> {
    try {
        // Sem provider configurado nada é enviado: sai cedo para não poluir log
        // com um erro por compra.
        const { data: waSettings } = await supabase
            .from("whatsapp_settings")
            .select("id, is_active")
            .eq("is_active", true)
            .maybeSingle();
        if (!waSettings) return;

        const { data: order } = await supabase
            .from("orders")
            .select("id, user_id, status, currency, total_amount, customer_name, customer_email, customer_phone")
            .eq("id", orderId)
            .maybeSingle<OrderRow>();

        if (!order || order.status !== "paid") return;

        const { data: items } = await supabase
            .from("order_items")
            .select("product_id, products:product_id(name, course_id, courses:course_id(title))")
            .eq("order_id", orderId);

        const courseNames: string[] = [];
        for (const item of items ?? []) {
            const product = (item as any).products;
            const name = product?.courses?.title || product?.name;
            if (name && !courseNames.includes(name)) courseNames.push(name);
        }
        const courseName = courseNames.join(", ");

        const { data: profile } = order.user_id
            ? await supabase.from("profiles").select("name, whatsapp").eq("id", order.user_id).maybeSingle()
            : { data: null };

        const buyerPhone: string | null = order.customer_phone || (profile as any)?.whatsapp || null;
        const buyerName = order.customer_name || (profile as any)?.name || "Aluno";
        const siteUrl = (Deno.env.get("SITE_URL") || Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");

        const send = async (phone: string, templateKey: string, variables: Record<string, string>) => {
            const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({ phone, templateKey, variables }),
            });
            if (!res.ok) {
                logger.warn(`[notify-order] ${templateKey} falhou (${res.status}): ${await res.text()}`);
            }
        };

        const sharedVars = {
            user_name: buyerName,
            customer_name: buyerName,
            customer_email: order.customer_email || "",
            course_name: courseName,
            amount: formatBRL(order.total_amount, order.currency),
            login_url: `${siteUrl}/login`,
        };

        if (buyerPhone) {
            await send(buyerPhone, "payment_confirmed", sharedVars);
            if (courseName) await send(buyerPhone, "course_access_granted", sharedVars);
        }

        // Aviso de venda nova para os admins que cadastraram WhatsApp.
        // `user_roles` aponta para auth.users, não para profiles: sem FK, o
        // embed do PostgREST falha. Consulta em duas etapas.
        const { data: adminRoles } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

        const adminIds = (adminRoles ?? []).map((r: any) => r.user_id).filter(Boolean);
        if (adminIds.length > 0) {
            const { data: adminProfiles } = await supabase
                .from("profiles")
                .select("whatsapp")
                .in("id", adminIds);

            for (const adminProfile of adminProfiles ?? []) {
                if (adminProfile?.whatsapp) {
                    await send(adminProfile.whatsapp, "new_order_admin", sharedVars);
                }
            }
        }
    } catch (error) {
        logger.error("[notify-order] falha ao notificar pedido pago", error);
    }
}
