// Autoverificação de `src/lib/csv.ts` — `node --test` sem bundler.
// O módulo é TypeScript sem imports, então `--experimental-strip-types` carrega direto.
//
// Rodar: node --test scripts/csv.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, csvCell, toCsv } from "../src/lib/csv.ts";

test("detecta ; como separador (Excel pt-BR)", () => {
  const rows = parseCsv("name;email\nMaria;maria@x.com");
  assert.deepEqual(rows, [["name", "email"], ["Maria", "maria@x.com"]]);
});

test("detecta , como separador (Sheets/en)", () => {
  const rows = parseCsv("name,email\nMaria,maria@x.com");
  assert.deepEqual(rows, [["name", "email"], ["Maria", "maria@x.com"]]);
});

test("campo entre aspas preserva separador e quebra de linha", () => {
  const rows = parseCsv('name;obs\n"Silva; Ana";"linha1\nlinha2"');
  assert.deepEqual(rows, [["name", "obs"], ["Silva; Ana", "linha1\nlinha2"]]);
});

test('aspas duplas escapadas ("") viram aspas simples', () => {
  const rows = parseCsv('name\n"Ana ""A"" Silva"');
  assert.deepEqual(rows, [["name"], ['Ana "A" Silva']]);
});

test("CRLF e BOM não sujam o primeiro campo", () => {
  const rows = parseCsv("\uFEFFname;email\r\nMaria;m@x.com\r\n");
  assert.deepEqual(rows, [["name", "email"], ["Maria", "m@x.com"]]);
});

test("linhas totalmente vazias são descartadas", () => {
  const rows = parseCsv("a;b\n\n1;2\n\n");
  assert.deepEqual(rows, [["a", "b"], ["1", "2"]]);
});

test("csvCell só adiciona aspas quando necessário", () => {
  assert.equal(csvCell("simples"), "simples");
  assert.equal(csvCell("com;ponto"), '"com;ponto"');
  assert.equal(csvCell('com "aspas"'), '"com ""aspas"""');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(42), "42");
});

test("toCsv gera BOM e CRLF", () => {
  const csv = toCsv(["name", "email"], [["Maria", "maria@x.com"]]);
  assert.equal(csv, "\uFEFFname;email\r\nMaria;maria@x.com");
});

test("ida e volta: toCsv -> parseCsv preserva os valores", () => {
  const rows = [["Ana; Silva", 'diz "oi"'], ["Bia", "linha\nnova"]];
  const parsed = parseCsv(toCsv(["a", "b"], rows).slice(1));
  assert.deepEqual(parsed, [["a", "b"], ...rows]);
});
