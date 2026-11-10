# Semana 2 — Mercado Pago Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** estabilizar e homologar 100% o fluxo existente do Mercado Pago em sandbox, garantindo reação visível no checkout, processamento consistente de cartão/Pix/boleto e persistência coerente do pedido.

**Architecture:** o plano preserva a estrutura atual e corrige apenas os bloqueios reais encontrados no fluxo existente. A execução começa no frontend do checkout para provar onde o clique em comprar para, depois valida o contrato com `payment-ops`, e só então fecha sandbox, retorno e webhook.

**Tech Stack:** React 18, TypeScript, Vite, React Hook Form, Zod, Supabase Edge Functions, Mercado Pago SDK, Supabase JS

---

## Estrutura de Arquivos

**Modificar:**
- `src/pages/checkout/Checkout.tsx` — submit do checkout, tokenização, chamada da Edge Function, feedback visual e redirect
- `src/components/checkout/PaymentMethods.tsx` — coerência entre método selecionado e métodos permitidos
- `src/types/checkout-form.ts` — regras de validação do checkout por método de pagamento
- `supabase/functions/payment-ops/index.ts` — contrato do payload, criação do pagamento e retorno do backend
- `src/pages/admin/Gateways.tsx` — conferência operacional da configuração sandbox, se necessário

**Criar:**
- `scripts/test-checkout-form-schema.mjs` — reprodução mínima da validação do formulário para provar bloqueios silenciosos
- `scripts/test-payment-ops-schema.mjs` — reprodução mínima do contrato esperado pelo backend
- `scripts/test-mercadopago-checklist.md` — checklist manual de homologação sandbox

---

### Task 1: Provar e corrigir bloqueio silencioso no submit do checkout

**Files:**
- Create: `scripts/test-checkout-form-schema.mjs`
- Modify: `src/types/checkout-form.ts:4-42`
- Modify: `src/pages/checkout/Checkout.tsx:176-343`

- [ ] **Step 1: Write the failing test**

Criar `scripts/test-checkout-form-schema.mjs` com este conteúdo:

```js
import { checkoutFormSchema } from '../src/types/checkout-form.ts';

const result = checkoutFormSchema.safeParse({
  name: 'Cliente Teste',
  email: 'cliente@teste.com',
  cpf: '52998224725',
  phone: '(11) 99999-9999',
  paymentMethod: 'pix'
});

if (!result.success) {
  console.error(JSON.stringify(result.error.format(), null, 2));
  process.exit(1);
}

console.log('PASS: checkoutFormSchema aceita Pix sem campos de cartão');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node "c:/WWW Projetos/neo-vidya-stream-main/Flow5/scripts/test-checkout-form-schema.mjs"`
Expected: FAIL mostrando que a validação do checkout ainda bloqueia o fluxo por regra incorreta ou import incompatível.

- [ ] **Step 3: Write minimal implementation**

Se o teste falhar por causa de regras indevidas, ajustar `src/types/checkout-form.ts` para que as exigências de cartão ocorram apenas quando `paymentMethod === "credit_card"` e não bloqueiem Pix/boleto silenciosamente. A regra final deve continuar neste formato:

```ts
if (data.paymentMethod === "credit_card") {
  if (!data.cardHolder || data.cardHolder.length < 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome no cartão é obrigatório", path: ["cardHolder"] });
  }
  if (!data.cardNumber || !cardUtils.validateLuhn(data.cardNumber)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número de cartão inválido", path: ["cardNumber"] });
  }
  if (!data.cardExpiration || !cardUtils.validateExpirationDate(data.cardExpiration)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data inválida ou expirada", path: ["cardExpiration"] });
  }
  if (!data.cardCvv || data.cardCvv.length < 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CVV inválido", path: ["cardCvv"] });
  }
  if (!data.installments) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecione o parcelamento", path: ["installments"] });
  }
}
```

Depois, em `src/pages/checkout/Checkout.tsx`, adicionar instrumentação mínima temporária e feedback visível no início de `handlePaymentSubmit` para provar que o submit foi alcançado:

```ts
const handlePaymentSubmit = async (data: CheckoutFormValues) => {
  setIsProcessing(true);
  try {
    console.log('[checkout] submit disparado', {
      paymentMethod: selectedMethod,
      gatewayId,
      hasPublicKey: Boolean(mpPublicKey),
    });
```

E adicionar callback explícito de erro de validação no `form.handleSubmit`:

```tsx
<form
  onSubmit={form.handleSubmit(
    handlePaymentSubmit,
    (errors) => {
      console.error('[checkout] validation errors', errors);
      toast.error('Verifique os campos obrigatórios do checkout.');
    }
  )}
  className="space-y-6"
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node "c:/WWW Projetos/neo-vidya-stream-main/Flow5/scripts/test-checkout-form-schema.mjs"`
Expected: `PASS: checkoutFormSchema aceita Pix sem campos de cartão`

- [ ] **Step 5: Verify UI behavior manually**

Run: `npm run dev`

Expected:
- ao clicar em comprar, o checkout mostra loading ou toast de erro;
- não existe mais cenário em que “nada acontece visualmente”.

- [ ] **Step 6: Commit**

```bash
git add scripts/test-checkout-form-schema.mjs src/types/checkout-form.ts src/pages/checkout/Checkout.tsx
git commit -m "fix(checkout): surface checkout submit and validation errors"
```

---

### Task 2: Provar e corrigir o contrato entre checkout e payment-ops

**Files:**
- Create: `scripts/test-payment-ops-schema.mjs`
- Modify: `supabase/functions/payment-ops/index.ts:11-30`
- Modify: `src/pages/checkout/Checkout.tsx:255-280`

- [ ] **Step 1: Write the failing test**

Criar `scripts/test-payment-ops-schema.mjs` com este conteúdo:

```js
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const source = readFileSync(
  'c:/WWW Projetos/neo-vidya-stream-main/Flow5/supabase/functions/payment-ops/index.ts',
  'utf8'
);

assert.match(source, /action:\s*z\.enum\(\['create_paymentIntent', 'check_payment_status'\]\)/);
assert.match(source, /gatewayId:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /payment_method_id:\s*z\.string\(\)\.optional\(\)/);
assert.match(source, /discountAmount:\s*z\.number\(\)\.optional\(\)/);

console.log('PASS: payment-ops expõe o contrato mínimo esperado pelo checkout');
```

- [ ] **Step 2: Run test to verify it fails only if contract diverged**

Run: `node "c:/WWW Projetos/neo-vidya-stream-main/Flow5/scripts/test-payment-ops-schema.mjs"`
Expected: PASS se o contrato mínimo existir; FAIL se alguém tiver divergido do payload esperado.

- [ ] **Step 3: Write minimal implementation**

Confrontar o payload enviado em `Checkout.tsx` com o schema aceito em `payment-ops`. Se existir divergência real descoberta durante a execução manual, corrigir apenas os campos divergentes.

O payload de referência do frontend deve continuar neste formato:

```ts
payload: {
  productId: productId,
  gatewayId: gatewayId,
  token,
  payment_method_id: paymentMethodId,
  issuer_id: issuerId,
  installments: Number(data.installments || 1),
  idempotencyKey,
  cpf: data.cpf,
  name: data.name,
  email: data.email,
  phone: data.phone,
  amount: finalAmountInCents,
  couponId: appliedCoupon?.valid ? appliedCoupon.coupon?.id : null,
  couponCode: appliedCoupon?.valid ? appliedCoupon.coupon?.code : null,
  discountAmount: couponDiscountInCents
}
```

Se necessário, adicionar log mínimo no backend logo após `validation.data`:

```ts
logger.info(`Action: ${action}`, {
  productId: payload?.productId,
  gatewayId: payload?.gatewayId,
  payment_method_id: payload?.payment_method_id,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node "c:/WWW Projetos/neo-vidya-stream-main/Flow5/scripts/test-payment-ops-schema.mjs"`
Expected: `PASS: payment-ops expõe o contrato mínimo esperado pelo checkout`

- [ ] **Step 5: Verify backend invocation manually**

No navegador, refazer o checkout com DevTools aberto.
Expected:
- existe chamada para `payment-ops`;
- se falhar, a falha agora é observável no toast ou no console;
- não existe mais “clique morto”.

- [ ] **Step 6: Commit**

```bash
git add scripts/test-payment-ops-schema.mjs src/pages/checkout/Checkout.tsx supabase/functions/payment-ops/index.ts
git commit -m "fix(payments): align checkout payload with payment ops"
```

---

### Task 3: Homologar cartão sandbox do Mercado Pago

**Files:**
- Modify: `src/pages/checkout/Checkout.tsx:185-233`
- Modify: `supabase/functions/payment-ops/index.ts:96-153`
- Modify: `src/pages/admin/Gateways.tsx:22-64`

- [ ] **Step 1: Write the failing test**

Registrar a reprodução manual atual antes da correção:

```md
Cenário: cartão sandbox
Dado um produto válido e gateway Mercado Pago configurado em teste
Quando preencho os dados obrigatórios e clico em comprar com cartão
Então hoje o checkout não mostra reação visual ou falha antes de concluir o fluxo
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run dev`

No navegador:
- abrir um checkout válido;
- preencher nome, email, CPF, telefone, cartão, validade, CVV e parcelas;
- clicar em comprar.

Expected: FAIL reproduzindo o problema real atual antes da correção final desta task.

- [ ] **Step 3: Write minimal implementation**

Ajustar somente o bloqueio real encontrado durante a execução. Os pontos permitidos para correção são:

1. `window.MercadoPago` não carregado quando o submit dispara;
2. `mpPublicKey` ausente ou RPC retornando configuração incompleta;
3. `createCardToken` falhando sem mensagem útil;
4. `paymentMethodId` ou `issuerId` vindo inconsistente;
5. backend escolhendo token errado nas credenciais (`access_token`, `secret_key`, `public_key`).

Se o backend estiver usando chave indevida, manter o provider somente com token secreto válido:

```ts
const token = credentials.access_token || credentials.secret_key;
if (!token) throw new Error('Token ausente');
return new MercadoPagoProvider({ accessToken: token });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run dev`

Expected:
- o cartão gera resposta observável;
- existe toast de sucesso ou erro real do Mercado Pago;
- se aprovado, há redirect para a página de obrigado;
- se pendente/rejeitado, a mensagem é explícita.

- [ ] **Step 5: Commit**

```bash
git add src/pages/checkout/Checkout.tsx supabase/functions/payment-ops/index.ts src/pages/admin/Gateways.tsx
git commit -m "fix(mercadopago): stabilize sandbox card checkout flow"
```

---

### Task 4: Homologar Pix e boleto sandbox

**Files:**
- Modify: `src/components/checkout/PaymentMethods.tsx:12-97`
- Modify: `src/pages/checkout/Checkout.tsx:237-326`
- Modify: `supabase/functions/payment-ops/index.ts:96-143`

- [ ] **Step 1: Write the failing test**

Registrar duas reproduções mínimas manuais:

```md
Cenário Pix:
Quando seleciono Pix e clico em comprar
Então devo receber QR code ou retorno equivalente

Cenário boleto:
Quando seleciono boleto e clico em comprar
Então devo receber ticket_url ou retorno equivalente
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run dev`

Expected: pelo menos um dos meios não entrega o retorno esperado antes da correção.

- [ ] **Step 3: Write minimal implementation**

Corrigir somente o que impedir o fluxo:
- garantir que `selectedMethod` reflita o método realmente escolhido;
- garantir que Pix e boleto não exijam token de cartão;
- garantir que o backend devolva `qr_code` e `ticket_url` quando existirem;
- garantir que o redirect preserve esses dados.

O redirect deve continuar neste formato:

```ts
let redirectUrl = `/checkout/obrigado/${orderId}?method=${method}`;
if (result.qr_code) {
  redirectUrl += `&qrcode=${encodeURIComponent(result.qr_code)}`;
}
if (result.ticket_url) {
  redirectUrl += `&ticket=${encodeURIComponent(result.ticket_url)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run dev`

Expected:
- Pix entrega QR code quando suportado pelo sandbox;
- boleto entrega ticket URL quando suportado;
- ambos persistem pedido pendente coerente.

- [ ] **Step 5: Commit**

```bash
git add src/components/checkout/PaymentMethods.tsx src/pages/checkout/Checkout.tsx supabase/functions/payment-ops/index.ts
git commit -m "fix(mercadopago): homologate pix and boleto sandbox flows"
```

---

### Task 5: Fechar checklist operacional e consistência de status

**Files:**
- Create: `scripts/test-mercadopago-checklist.md`
- Modify: `supabase/functions/payment-ops/index.ts:218-319`
- Modify: `FlowMembers-Evolution-Package/2026-04-19-semana-2-mercadopago-design.md`

- [ ] **Step 1: Write the failing test**

Criar `scripts/test-mercadopago-checklist.md` com checklist inicial ainda não validado:

```md
# Checklist Mercado Pago Sandbox

- [ ] Cartão de teste dispara submit visível
- [ ] Cartão de teste cria pagamento com retorno coerente
- [ ] Pix gera QR code
- [ ] Boleto gera ticket URL
- [ ] Pedido é persistido no banco
- [ ] Status do pedido reflete retorno do pagamento
- [ ] Redirect para obrigado funciona
- [ ] Configuração admin está coerente com sandbox
```

- [ ] **Step 2: Run test to verify it fails**

Run: revisar o arquivo e manter todos os itens desmarcados antes da homologação final.
Expected: checklist ainda incompleto.

- [ ] **Step 3: Write minimal implementation**

Se durante a homologação final aparecer inconsistência de status, ajustar apenas o trecho necessário em `payment-ops` para não criar divergência entre resposta retornada e status persistido.

A lógica mínima deve continuar mapeando:

```ts
let status: 'pending' | 'paid' | 'failed' = 'pending';
if (data.status === 'approved') status = 'paid';
if (data.status === 'rejected' || data.status === 'cancelled') status = 'failed';
```

Depois, atualizar a spec da Semana 2 apenas no status final se a homologação tiver sido concluída.

- [ ] **Step 4: Run test to verify it passes**

Run: homologação manual completa em sandbox.
Expected:
- checklist preenchido com evidência fresca;
- todos os itens aplicáveis marcados.

- [ ] **Step 5: Commit**

```bash
git add scripts/test-mercadopago-checklist.md supabase/functions/payment-ops/index.ts FlowMembers-Evolution-Package/2026-04-19-semana-2-mercadopago-design.md
git commit -m "docs(payments): record mercadopago sandbox homologation checklist"
```

---

## Revisão de Cobertura da Spec

- Camada A coberta pela Task 1
- Camada B coberta pela Task 2
- Camada C coberta pelas Tasks 3 e 4
- Camada D coberta pela Task 5
- Escopo mantido sem abrir novos gateways
- Estratégia GSD respeitada: primeiro clique, depois submit, depois backend, depois sandbox, depois retorno

---

## Observações de Execução

- Este projeto não tem suíte de testes automatizados pronta para esse fluxo; por isso o plano usa reproduções mínimas e scripts de regressão local.
- Não expandir arquitetura durante a execução.
- Não abrir Stripe/Asaas nesta semana.
- Não marcar task como concluída sem evidência fresca no navegador, logs ou banco.
