import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";

/**
 * Rastreio e descadastro de campanha — público, `verify_jwt = false`.
 *
 * É chamado pelo cliente de e-mail (pixel) e pelo próprio destinatário (link de
 * descadastro), então não há como exigir credencial. O que autoriza é o `token`
 * uuid por linha, que o destinatário só conhece pelo e-mail que recebeu.
 *
 * `a=open` devolve um GIF transparente 1×1 sempre, mesmo com token inválido:
 * pixel quebrado no cliente de e-mail é pior que pixel ignorado.
 * `a=unsubscribe` grava o opt-out e devolve uma página mínima de confirmação.
 */

const GIF = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (c) => c.charCodeAt(0),
);

const noStore = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "Content-Type": "image/gif",
};

function page(title: string, body: string): Response {
  return new Response(
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;color:#18181b;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}
  .card{background:#fff;border-radius:16px;padding:40px;max-width:440px;text-align:center;box-shadow:0 4px 6px -1px rgba(0,0,0,.1)}
  h1{font-size:20px;margin:0 0 12px}
  p{color:#52525b;font-size:15px;line-height:1.6;margin:0}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${body}</p></div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  const action = url.searchParams.get("a") ?? "open";

  if (action === "open") {
    if (token) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        // `is null` para a primeira abertura vencer; reabrir não reescreve.
        await supabase
          .from("email_campaign_sends")
          .update({ opened_at: new Date().toISOString() })
          .eq("token", token)
          .is("opened_at", null);
      } catch (error) {
        logger.warn("[campaign-track] abertura não registrada", error);
      }
    }
    return new Response(GIF, { headers: noStore });
  }

  if (action !== "unsubscribe") {
    return page("Link inválido", "Este link não existe ou expirou.");
  }

  if (!token) return page("Link inválido", "Este link não existe ou expirou.");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: send } = await supabase
      .from("email_campaign_sends")
      .select("recipient_email")
      .eq("token", token)
      .maybeSingle();

    if (!send?.recipient_email) {
      return page("Link inválido", "Este link não existe ou expirou.");
    }

    const email = send.recipient_email.toLowerCase();
    const { error } = await supabase
      .from("email_opt_outs")
      .upsert({ email, reason: "link de descadastro", source: "unsubscribe" }, { onConflict: "email" });

    if (error) {
      logger.error("[campaign-track] falha ao gravar opt-out", error);
      return page("Não foi possível", "Tente novamente em alguns minutos.");
    }

    return page("Descadastro confirmado", `${email} não receberá mais nossos e-mails de campanha.`);
  } catch (error) {
    logger.error("[campaign-track] erro", error);
    return page("Não foi possível", "Tente novamente em alguns minutos.");
  }
});
