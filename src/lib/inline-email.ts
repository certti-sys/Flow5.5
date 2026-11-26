/**
 * Normaliza o HTML devolvido pela edge preview-campaign para injecao segura
 * num container inline. A edge as vezes devolve um documento completo
 * (<!DOCTYPE><html><body>), e injetar isso dentro de um <div> faz o navegador
 * reestruturar o DOM e engolir elementos de fora.
 */
export function extrairCorpoEmail(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body.innerHTML;
  return body.trim() || html.trim();
}
