// Verifica a lógica pura do funil de carrinho abandonado sem subir a edge:
// extrai as funções de `supabase/functions/cart-recovery/index.ts` e roda
// asserções sobre fallback de template e substituição de variáveis.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

const names = [
  "money",
  "stageMessage",
  "stageEmailMessage",
  "renderTemplate",
  "stageSubject",
  "smsStageDefault",
  "stageContent",
];

// esbuild já vem com o Vite; evita reimplementar o parser só para tirar os
// tipos das anotações.
const src = transformSync(readFileSync("supabase/functions/cart-recovery/index.ts", "utf8"), {
  loader: "ts",
}).code;

const body = names
  .map((name) => {
    const start = src.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `função ${name} não encontrada na edge`);
    const end = src.indexOf("\n}", start);
    assert.ok(end > start, `função ${name} sem fechamento`);
    return src.slice(start, end + 2);
  })
  .join("\n");

const fn = new Function(`${body}\nreturn { ${names.join(", ")} };`)();

const vars = { nome: "Ana Souza", produto: "Curso X", preco: "R$ 197,00", link: "https://x/c/curso" };

// 1. Sem templates gravados, o texto padrão continua valendo (quem nunca abriu
//    a tela não muda de comportamento).
for (const stage of [1, 2, 3]) {
  const out = fn.stageContent(stage, vars, null);
  assert.equal(out.emailBody, fn.stageEmailMessage(stage, vars), `estágio ${stage}: e-mail padrão`);
  assert.equal(out.whatsappBody, fn.stageMessage(stage, vars), `estágio ${stage}: WhatsApp padrão`);
  assert.equal(out.subject, fn.stageSubject(stage, vars.produto), `estágio ${stage}: assunto padrão`);
  assert.equal(out.smsBody, fn.smsStageDefault(stage, vars), `estágio ${stage}: SMS padrão`);
}

// 1b. E-mail não carrega a marcação de negrito do WhatsApp.
for (const stage of [1, 2, 3]) {
  assert.ok(!fn.stageEmailMessage(stage, vars).includes("*"), `estágio ${stage}: e-mail sem asterisco`);
  assert.ok(fn.stageMessage(stage, vars).includes("*"), `estágio ${stage}: WhatsApp mantém negrito`);
}

// 2. Template gravado vence o padrão, e as variáveis são substituídas.
const custom = {
  email: [{ subject: "Oi {nome}", body: "Volta, {nome}! {produto} por {preco}" }],
  whatsapp: [{ body: "wa {nome}" }],
  sms: [{ body: "sms {link}" }],
};
const out1 = fn.stageContent(1, vars, custom);
assert.equal(out1.subject, "Oi Ana Souza");
assert.equal(out1.emailBody, "Volta, Ana Souza! Curso X por R$ 197,00");
assert.equal(out1.whatsappBody, "wa Ana Souza");
assert.equal(out1.smsBody, "sms https://x/c/curso");

// 3. Estágio sem template gravado cai no padrão mesmo com o canal configurado.
const out2 = fn.stageContent(2, vars, custom);
assert.equal(out2.emailBody, fn.stageEmailMessage(2, vars));

// 4. Texto em branco é tratado como ausente (não zera a mensagem do lead).
const blank = { email: [{ subject: "   ", body: "  " }], sms: [{ body: "" }] };
const out3 = fn.stageContent(1, vars, blank);
assert.equal(out3.subject, fn.stageSubject(1, vars.produto));
assert.equal(out3.emailBody, fn.stageEmailMessage(1, vars));
assert.equal(out3.smsBody, fn.smsStageDefault(1, vars));

// 5. SMS padrão cabe no limite de 160 da IntegraX.
for (const stage of [1, 2, 3]) {
  assert.ok(
    fn.smsStageDefault(stage, vars).length <= 160,
    `SMS padrão do estágio ${stage} passou de 160 caracteres`,
  );
}

console.log("OK — templates do carrinho abandonado: fallback, substituição e limite de SMS.");
