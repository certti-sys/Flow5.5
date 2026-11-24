/** Valores que podem ser interpolados no texto das páginas pós-compra. */
export interface PostPurchaseVars {
    nome?: string | null;
    produto?: string | null;
}

/** Substitui `{nome}` / `{produto}`; variável vazia vira string vazia. */
export function fillPostPurchaseVars(text: string, vars: PostPurchaseVars = {}): string {
    const nome = (vars.nome ?? "").trim();
    const produto = (vars.produto ?? "").trim();
    return text
        .split("{nome}").join(nome)
        .split("{produto}").join(produto);
}

/** Argumentos da prévia: valores de exemplo, iguais aos do render real. */
export const PREVIEW_VARS: PostPurchaseVars = { nome: "Maria", produto: "Curso Exemplo" };
