# Plano de Execução: Estabilização Mercado Pago - Semana 2

**Data:** 2026-04-21  
**Objetivo:** Corrigir bloqueio silencioso no checkout (clique em "Comprar" não produz ação visível)  
**Estratégia:** GSD - diagnosticar camada por camada, começar pelo frontend  
**Escopo:** Apenas Mercado Pago, sem novos gateways  

---

## Task 1: Provar e corrigir bloqueio silencioso no submit do checkout

**Objetivo:** Garantir que clique em "Comprar" sempre produz ação visível (loading, erro ou avanço)

### Step 1: Criar script de teste para validação do formulário
- [ ] Criar arquivo: `scripts/test-checkout-form-schema.mjs`
- [ ] Testar se schema aceita Pix sem campos de cartão
- [ ] Executar: `node scripts/test-checkout-form-schema.mjs`
- [ ] Esperado: PASS ou FAIL claro

### Step 2: Adicionar instrumentação no handlePaymentSubmit
- [ ] Abrir: `src/pages/checkout/Checkout.tsx`
- [ ] Adicionar console.log no início de `handlePaymentSubmit`
- [ ] Adicionar callback de erro no `form.handleSubmit`
- [ ] Testar no navegador com DevTools aberto

### Step 3: Verificar se validação está bloqueando
- [ ] Executar: `npm run dev`
- [ ] Abrir checkout
- [ ] Preencher dados básicos (nome, email, CPF, telefone)
- [ ] Selecionar Pix
- [ ] Clicar em "Comprar"
- [ ] Verificar console para logs
- [ ] Esperado: Ver "submit disparado" ou erro de validação claro

### Step 4: Corrigir se necessário
- [ ] Se validação bloqueia Pix/boleto, ajustar `src/types/checkout-form.ts`
- [ ] Garantir que card fields são obrigatórios APENAS para credit_card
- [ ] Testar novamente

### Step 5: Commit
```bash
git add scripts/test-checkout-form-schema.mjs src/pages/checkout/Checkout.tsx src/types/checkout-form.ts
git commit -m "fix(checkout): surface checkout submit and validation errors"
```

---

## Task 2: Validar contrato entre checkout e payment-ops

**Objetivo:** Garantir que payload do frontend é compatível com schema da Edge Function

### Step 1: Criar script de teste para contrato
- [ ] Criar arquivo: `scripts/test-payment-ops-schema.mjs`
- [ ] Verificar se payment-ops expõe campos esperados
- [ ] Executar: `node scripts/test-payment-ops-schema.mjs`

### Step 2: Confrontar payload
- [ ] Abrir: `src/pages/checkout/Checkout.tsx` (linha ~268)
- [ ] Verificar payload enviado
- [ ] Abrir: `supabase/functions/payment-ops/index.ts` (linha ~11)
- [ ] Verificar schema aceito
- [ ] Identificar divergências

### Step 3: Corrigir divergências
- [ ] Se houver campos faltando, adicionar ao schema
- [ ] Se houver campos extras, remover do payload
- [ ] Adicionar log mínimo no backend após validação

### Step 4: Testar invocação
- [ ] Executar: `npm run dev`
- [ ] Abrir checkout
- [ ] Preencher dados
- [ ] Clicar em "Comprar"
- [ ] Verificar DevTools → Network → payment-ops
- [ ] Esperado: Chamada para payment-ops com payload válido

### Step 5: Commit
```bash
git add scripts/test-payment-ops-schema.mjs src/pages/checkout/Checkout.tsx supabase/functions/payment-ops/index.ts
git commit -m "fix(payments): align checkout payload with payment ops"
```

---

## Task 3: Homologar cartão sandbox Mercado Pago

**Objetivo:** Fazer cartão de teste processar até retorno esperado

### Step 1: Verificar carregamento do SDK
- [ ] Abrir: `src/pages/checkout/Checkout.tsx` (linha ~100)
- [ ] Verificar se script do Mercado Pago carrega
- [ ] Testar no navegador: `console.log(window.MercadoPago)`
- [ ] Esperado: Objeto MercadoPago disponível

### Step 2: Verificar chave pública
- [ ] Abrir: `src/pages/checkout/Checkout.tsx` (linha ~86)
- [ ] Verificar se RPC `get_gateway_public_key` retorna chave
- [ ] Testar no navegador: `console.log(mpPublicKey)`
- [ ] Esperado: Chave pública carregada

### Step 3: Testar tokenização
- [ ] Preencher dados do cartão de teste
- [ ] Verificar console para logs de tokenização
- [ ] Esperado: Token criado com sucesso

### Step 4: Verificar credenciais backend
- [ ] Abrir: `supabase/functions/payment-ops/index.ts` (linha ~70)
- [ ] Verificar se está usando `access_token` correto
- [ ] Testar chamada para Mercado Pago API

### Step 5: Testar fluxo completo
- [ ] Executar: `npm run dev`
- [ ] Preencher checkout com cartão de teste
- [ ] Clicar em "Comprar"
- [ ] Esperado: Redirect para página de obrigado OU erro claro

### Step 6: Commit
```bash
git add src/pages/checkout/Checkout.tsx supabase/functions/payment-ops/index.ts
git commit -m "fix(mercadopago): stabilize sandbox card checkout flow"
```

---

## Task 4: Homologar Pix e boleto

**Objetivo:** Validar que Pix gera QR code e boleto gera ticket URL

### Step 1: Testar Pix
- [ ] Executar: `npm run dev`
- [ ] Selecionar Pix no checkout
- [ ] Preencher dados básicos
- [ ] Clicar em "Comprar"
- [ ] Esperado: Redirect com QR code ou mensagem de sucesso

### Step 2: Testar boleto
- [ ] Selecionar boleto no checkout
- [ ] Preencher dados básicos
- [ ] Clicar em "Comprar"
- [ ] Esperado: Redirect com ticket URL ou mensagem de sucesso

### Step 3: Corrigir se necessário
- [ ] Se Pix/boleto não funcionam, verificar:
  - [ ] `selectedMethod` reflete método escolhido
  - [ ] Backend não exige token de cartão
  - [ ] Backend retorna `qr_code` ou `ticket_url`
  - [ ] Redirect preserva dados

### Step 4: Commit
```bash
git add src/components/checkout/PaymentMethods.tsx src/pages/checkout/Checkout.tsx supabase/functions/payment-ops/index.ts
git commit -m "fix(mercadopago): homologate pix and boleto sandbox flows"
```

---

## Task 5: Fechar checklist operacional

**Objetivo:** Registrar evidência de homologação completa

### Step 1: Criar checklist
- [ ] Criar arquivo: `scripts/test-mercadopago-checklist.md`
- [ ] Listar todos os cenários a validar

### Step 2: Executar homologação manual
- [ ] Testar cartão: submit → token → payment-ops → redirect
- [ ] Testar Pix: submit → payment-ops → QR code
- [ ] Testar boleto: submit → payment-ops → ticket URL
- [ ] Verificar persistência de pedido no banco
- [ ] Verificar status do pedido

### Step 3: Preencher checklist
- [ ] Marcar todos os itens validados
- [ ] Registrar evidência (screenshots, logs)

### Step 4: Commit
```bash
git add scripts/test-mercadopago-checklist.md supabase/functions/payment-ops/index.ts
git commit -m "docs(payments): record mercadopago sandbox homologation checklist"
```

---

## Critérios de Sucesso

- ✅ Clique em "Comprar" sempre produz ação visível
- ✅ Erros de validação são claros
- ✅ Cartão de teste processa até retorno
- ✅ Pix gera QR code
- ✅ Boleto gera ticket URL
- ✅ Pedido persistido com status coerente
- ✅ Checklist operacional preenchido

---

## Notas de Execução

- Não expandir arquitetura durante execução
- Não abrir Stripe/Asaas nesta semana
- Não marcar task como concluída sem evidência fresca
- Usar DevTools e console.log para diagnosticar
- Testar cada passo antes de avançar
