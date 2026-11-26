/**
 * Helpers do editor de e-mail em iframe.
 *
 * O preview devolvido pela edge preview-campaign e um documento COMPLETO
 * (doctype + head + style + corpo) com rodape, pixel e links reescritos pelo
 * envio. O editor edita esse documento dentro de um iframe (CSS isolado) e,
 * ao salvar, precisa devolver o HTML original do autor — sem o que o envio
 * adicionou, mas com doctype/head/style intactos.
 */

const ALVO_TRACKING = "data-flow-tracking";
const TRACKER_CLICK = /\/campaign-track\?t=[^&"]*&a=click&u=([^&"]*)/i;

/** Remove rodape/pixel e desfaz a reescrita de links, preservando o documento. */
export function limparPreviewParaSalvar(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll(`[${ALVO_TRACKING}]`).forEach((no) => no.remove());
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") ?? "";
    const m = href.match(TRACKER_CLICK);
    if (!m) return;
    try {
      a.setAttribute("href", decodeURIComponent(m[1]));
    } catch {
      // URL malformada: mantem o que esta para nao perder o link.
    }
  });

  const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : "";
  const corpo = doc.documentElement.outerHTML;
  return doctype ? `${doctype}\n${corpo}` : corpo;
}

/** Conta quantos estilos/vinculos o HTML tem — usado no check de integridade. */
export function assinaturaHtml(html: string) {
  return {
    bytes: html.length,
    doctype: /<!DOCTYPE/i.test(html),
    head: /<head/i.test(html),
    style: /<style/i.test(html),
    table: /<table/i.test(html),
  };
}
