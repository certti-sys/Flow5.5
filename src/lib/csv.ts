/** CSV mínimo para import/export de alunos. Sem dependência externa. */

/**
 * Quebra o texto em linhas/campos respeitando aspas duplas.
 *
 * O separador é inferido da primeira linha porque o Excel pt-BR salva em `;`
 * e o Sheets/en exportam em `,`. Inferir evita exigir configuração do admin.
 */
export function parseCsv(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, "");
  const firstBreak = text.indexOf("\n");
  const firstLine = firstBreak === -1 ? text : text.slice(0, firstBreak);
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const delimiter = semicolons > commas ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\r") {
      // ignorado: CRLF e LF produzem o mesmo resultado
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Escapa um campo para CSV, adicionando aspas só quando necessário. */
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: unknown[][], delimiter = ";"): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(delimiter));
  // BOM: sem ele o Excel pt-BR lê os acentos como mojibake.
  return "\uFEFF" + lines.join("\r\n");
}
