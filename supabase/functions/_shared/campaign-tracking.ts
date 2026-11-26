/**
 * Tracking de campanha — fonte única para envio e preview.
 *
 * O rodapé de descadastro é obrigatório (sem ele a campanha vira spam) e o
 * pixel mede abertura. Links absolutos são reescritos para passar pelo tracker;
 * o HTML salvo no editor permanece intacto — a reescrita acontece só no envio
 * e no preview, nunca no banco.
 */
export function withCampaignTracking(html: string, token: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const link = `${base}/functions/v1/campaign-track?t=${token}`;

  const tracked = html.replace(
    /href=(["'])(\s*https?:\/\/[^"']+)\1/gi,
    (_m, quote: string, target: string) => {
      const trimmed = target.trim();
      return `href=${quote}${link}&a=click&u=${encodeURIComponent(trimmed)}${quote}`;
    },
  );

  const pixel = `<img src="${link}&a=open" width="1" height="1" alt="" style="display:block;border:0;outline:none;" />`;
  const footer = `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;text-align:center;font-family:Arial,sans-serif;">
  Você recebeu este e-mail porque tem conta ou já comprou na plataforma.<br>
  <a href="${link}&a=unsubscribe" style="color:#a1a1aa;">Não quero mais receber estes e-mails</a>
</div>`;
  // Wrapper identifica o que e gerado pelo envio: o editor inline nunca
  // deve salvar rodape/pixel de volta em body_html.
  return `${tracked}<div data-flow-tracking="1">${footer}${pixel}</div>`;
}
