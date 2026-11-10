# Checklist de Implementação - FlowMembers Evolution

**Versão:** 1.0  
**Data:** 2026-04-18  
**Uso:** Marcar cada item conforme implementa
**Status atual:** Semana 1 (Cupons) concluída e estabilizada em 2026-04-19

---

## Como Usar Este Checklist

1. Imprima ou mantenha aberto em tela secundária
2. Marque `[x]` conforme completa cada item
3. Não pule etapas (dependências entre features)
4. Teste cada feature antes de marcar como completa
5. Commit após cada feature principal

---

## PRÉ-REQUISITOS

### Setup Inicial

- [ ] FlowMembers clonado e rodando localmente
- [ ] Supabase CLI instalado (`npm install -g supabase`)
- [ ] Supabase project criado e linkado
- [ ] Getfy PHP baixado para referência
- [ ] Node.js 18+ instalado
- [ ] Git configurado

### Ambiente de Desenvolvimento

- [ ] `.env.local` configurado com credenciais Supabase
- [ ] Banco de dados local rodando (`supabase start`)
- [ ] Hot reload funcionando (`npm run dev`)
- [ ] TypeScript sem erros (`npm run build`)

### Ferramentas Opcionais

- [ ] Postman/Insomnia para testar Edge Functions
- [ ] Supabase Studio aberto (http://localhost:54323)
- [ ] Claude Code ou ChatGPT aberto para IA assistida

---

## FASE 1: FUNDAÇÃO COMERCIAL (4 semanas)

### Semana 1: Sistema de Cupons Avançado

**Status real em 2026-04-19:** ✅ concluída e estabilizada em ambiente real
- Banco, policies, Edge Function, admin e checkout público já implementados
- Correções finais aplicadas no fluxo público de validação e CORS
- Esta semana agora serve como referência validada para as próximas entregas

#### 1.1 Database Schema

- [x] Criar migration: `supabase migration new coupons_system`
- [x] Adicionar tabela `coupons`
  - [x] Campos: id, code, discount_type, discount_value
  - [x] Campos: max_uses, uses_count, valid_from, valid_until
  - [x] Campos: min_purchase_amount, is_active
  - [x] Timestamps: created_at, updated_at
- [x] Adicionar tabela `coupon_products` (many-to-many)
  - [x] coupon_id, product_id
  - [x] Primary key composta
- [x] Adicionar tabela `coupon_usage` (histórico)
  - [x] id, coupon_id, order_id, user_id
  - [x] discount_applied, created_at
- [x] Criar índices:
  - [x] `idx_coupons_code` em coupons(code)
  - [x] `idx_coupon_usage_coupon` em coupon_usage(coupon_id)
- [x] Adicionar RLS policies:
  - [x] Apenas admins podem inserir/atualizar coupons
  - [x] Todos podem ler coupons ativos
- [x] Rodar migration: `supabase db push`
- [x] Verificar no Supabase Studio

**Observação operacional:** schema e policies conferidos também no projeto Supabase real.

#### 1.2 Edge Function - Validação

- [x] Criar função: `supabase functions new validate-coupon`
- [x] Instalar dependências: `zod` no deno.json
- [x] Implementar validação de input (Zod schema)
- [x] Implementar lógica:
  - [x] Buscar cupom por código
  - [x] Validar se está ativo
  - [x] Validar data (valid_from, valid_until)
  - [x] Validar produto (se aplicável)
  - [x] Validar valor mínimo
  - [x] Validar limite de uso (max_uses vs uses_count)
- [x] Calcular desconto (percent ou fixed)
- [x] Retornar resultado tipado
- [x] Deploy: `supabase functions deploy validate-coupon`
- [x] Testar via Postman/curl

**Observação operacional:** fluxo estabilizado no ambiente real após correção de Authorization opcional e CORS com `x-requested-with`.

**Referência Getfy:**
- `app/Http/Controllers/CheckoutController.php` - método `validateCoupon`

#### 1.3 React Hook

- [x] Criar arquivo: `src/features/coupons/hooks/useCouponValidation.ts`
- [x] Implementar useMutation (TanStack Query)
- [x] Chamar Edge Function via `supabase.functions.invoke`
- [x] Tipagem completa (input e output)
- [x] Error handling
- [x] Exportar hook

#### 1.4 Componente CouponInput

- [x] Criar arquivo: `src/features/coupons/components/CouponInput.tsx`
- [x] Usar shadcn/ui components (Input, Button)
- [x] State para código do cupom
- [x] Botão "Aplicar" com loading state
- [x] Chamar hook useCouponValidation
- [x] Mostrar toast de sucesso/erro (sonner)
- [x] Callback onApply quando válido
- [x] Props tipadas: `{ productId, amount, onApply }`

#### 1.5 Admin Page - CRUD Cupons

- [x] Criar arquivo: `src/pages/admin/Coupons.tsx`
- [x] Query para listar cupons (TanStack Query)
- [x] Tabela com colunas:
  - [x] Código, Tipo, Valor, Usos, Status, Ações
- [x] Filtros: status (ativo/inativo), busca por código
- [x] Modal de criação/edição:
  - [x] Form com react-hook-form + Zod
  - [x] Campos: code, discount_type, discount_value
  - [x] Campos: max_uses, valid_from, valid_until
  - [x] Seletor de produtos (multi-select)
  - [x] Toggle is_active
- [x] Mutations: create, update, delete
- [x] Estatísticas: total de cupons, usos hoje, desconto total
- [x] Adicionar rota no App.tsx

#### 1.6 Tipos TypeScript

- [x] Criar arquivo: `src/features/coupons/types/index.ts`
- [x] Interface `Coupon`
- [x] Type `DiscountType = 'percent' | 'fixed'`
- [x] Type `CouponValidationResult`
- [x] Type `CouponFormData`
- [x] Exportar todos os tipos

#### 1.7 Integração no Checkout

- [x] Abrir `src/pages/checkout/Checkout.tsx`
- [x] Adicionar state: `appliedCoupon`
- [x] Renderizar `<CouponInput />` antes do payment
- [x] Atualizar `OrderSummary` para mostrar desconto
- [x] Calcular `finalAmount = amount - discount`
- [x] Salvar `coupon_code` no order ao processar
- [x] Incrementar `uses_count` após pagamento bem-sucedido

#### 1.8 Testes

- [x] Testar cupom válido
- [x] Testar cupom expirado
- [x] Testar cupom esgotado (max_uses)
- [x] Testar valor mínimo não atingido
- [x] Testar cupom para produto errado
- [x] Testar desconto percentual
- [x] Testar desconto fixo
- [x] Testar admin CRUD completo

**Observação operacional:** adicionada verificação mínima local para regressão de CORS da Edge Function.

#### 1.9 Commit

- [x] `git add .`
- [x] `git commit -m "feat: sistema de cupons avançado"`
- [ ] `git push`

---

### Semana 2: Múltiplos Gateways de Pagamento

**Prioridade GSD:** implementar primeiro um gateway principal fim a fim, validar webhook e persistência do pedido, e só depois expandir para os demais.

**Referência Getfy:**
- `database/migrations/2025_02_20_120001_create_coupons_table.php`

#### 1.2 Edge Function - Validação

- [ ] Criar função: `supabase functions new validate-coupon`
- [ ] Instalar dependências: `zod` no deno.json
- [ ] Implementar validação de input (Zod schema)
- [ ] Implementar lógica:
  - [ ] Buscar cupom por código
  - [ ] Validar se está ativo
  - [ ] Validar data (valid_from, valid_until)
  - [ ] Validar produto (se aplicável)
  - [ ] Validar valor mínimo
  - [ ] Validar limite de uso (max_uses vs uses_count)
- [ ] Calcular desconto (percent ou fixed)
- [ ] Retornar resultado tipado
- [ ] Deploy: `supabase functions deploy validate-coupon`
- [ ] Testar via Postman/curl

**Referência Getfy:**
- `app/Http/Controllers/CheckoutController.php` - método `validateCoupon`

#### 1.3 React Hook

- [ ] Criar arquivo: `src/features/coupons/hooks/useCouponValidation.ts`
- [ ] Implementar useMutation (TanStack Query)
- [ ] Chamar Edge Function via `supabase.functions.invoke`
- [ ] Tipagem completa (input e output)
- [ ] Error handling
- [ ] Exportar hook

#### 1.4 Componente CouponInput

- [ ] Criar arquivo: `src/features/coupons/components/CouponInput.tsx`
- [ ] Usar shadcn/ui components (Input, Button)
- [ ] State para código do cupom
- [ ] Botão "Aplicar" com loading state
- [ ] Chamar hook useCouponValidation
- [ ] Mostrar toast de sucesso/erro (sonner)
- [ ] Callback onApply quando válido
- [ ] Props tipadas: `{ productId, amount, onApply }`

#### 1.5 Admin Page - CRUD Cupons

- [ ] Criar arquivo: `src/pages/admin/Coupons.tsx`
- [ ] Query para listar cupons (TanStack Query)
- [ ] Tabela com colunas:
  - [ ] Código, Tipo, Valor, Usos, Status, Ações
- [ ] Filtros: status (ativo/inativo), busca por código
- [ ] Modal de criação/edição:
  - [ ] Form com react-hook-form + Zod
  - [ ] Campos: code, discount_type, discount_value
  - [ ] Campos: max_uses, valid_from, valid_until
  - [ ] Seletor de produtos (multi-select)
  - [ ] Toggle is_active
- [ ] Mutations: create, update, delete
- [ ] Estatísticas: total de cupons, usos hoje, desconto total
- [ ] Adicionar rota no App.tsx

#### 1.6 Tipos TypeScript

- [ ] Criar arquivo: `src/features/coupons/types/index.ts`
- [ ] Interface `Coupon`
- [ ] Type `DiscountType = 'percent' | 'fixed'`
- [ ] Type `CouponValidationResult`
- [ ] Type `CouponFormData`
- [ ] Exportar todos os tipos

#### 1.7 Integração no Checkout

- [ ] Abrir `src/pages/checkout/Checkout.tsx`
- [ ] Adicionar state: `appliedCoupon`
- [ ] Renderizar `<CouponInput />` antes do payment
- [ ] Atualizar `OrderSummary` para mostrar desconto
- [ ] Calcular `finalAmount = amount - discount`
- [ ] Salvar `coupon_code` no order ao processar
- [ ] Incrementar `uses_count` após pagamento bem-sucedido

#### 1.8 Testes

- [ ] Testar cupom válido
- [ ] Testar cupom expirado
- [ ] Testar cupom esgotado (max_uses)
- [ ] Testar valor mínimo não atingido
- [ ] Testar cupom para produto errado
- [ ] Testar desconto percentual
- [ ] Testar desconto fixo
- [ ] Testar admin CRUD completo

#### 1.9 Commit

- [ ] `git add .`
- [ ] `git commit -m "feat: sistema de cupons avançado"`
- [ ] `git push`

---

### Semana 2: Múltiplos Gateways de Pagamento

#### 2.1 Database Schema

- [ ] Criar migration: `supabase migration new gateway_configs`
- [ ] Adicionar tabela `gateway_configs`
  - [ ] id, slug, name, is_active
  - [ ] credentials (jsonb, encrypted)
  - [ ] allowed_methods (text[])
  - [ ] config (jsonb)
- [ ] RLS: apenas admins podem ver credentials
- [ ] Rodar migration

**Referência Getfy:**
- `database/migrations/2025_02_21_100000_create_gateway_credentials_table.php`

#### 2.2 Edge Function - Stripe

- [ ] Criar função: `supabase functions new gateway-stripe`
- [ ] Instalar: `stripe` package no deno.json
- [ ] Implementar `createPaymentIntent`:
  - [ ] Buscar credentials do gateway
  - [ ] Inicializar Stripe SDK
  - [ ] Criar Payment Intent
  - [ ] Retornar client_secret
- [ ] Implementar `confirmPayment`
- [ ] Implementar `createSubscription` (para Fase 2)
- [ ] Deploy função
- [ ] Testar com Stripe test keys

**Referência Getfy:**
- `app/Gateways/Stripe/StripeDriver.php`

#### 2.3 Edge Function - PIX Nativo (Efi)

- [ ] Criar função: `supabase functions new gateway-pix-efi`
- [ ] Instalar: `sdk-node-apis-efi` (se disponível para Deno)
- [ ] Implementar `generatePix`:
  - [ ] Buscar credentials
  - [ ] Criar cobrança PIX
  - [ ] Retornar: txid, qr_code, qr_code_image
- [ ] Implementar `checkPixStatus`
- [ ] Deploy função
- [ ] Testar com Efi sandbox

**Referência Getfy:**
- `app/Gateways/Efi/EfiDriver.php`

#### 2.4 Edge Function - Asaas

- [ ] Criar função: `supabase functions new gateway-asaas`
- [ ] Implementar `createPayment`:
  - [ ] Suportar: card, pix, boleto
  - [ ] Buscar credentials
  - [ ] Fazer requisição HTTP para Asaas API
  - [ ] Retornar dados de pagamento
- [ ] Deploy função
- [ ] Testar com Asaas sandbox

**Referência Getfy:**
- `app/Gateways/Asaas/AsaasDriver.php`

#### 2.5 React - Gateway Selector

- [ ] Criar: `src/features/gateways/components/GatewaySelector.tsx`
- [ ] Query para buscar gateways ativos
- [ ] Renderizar cards por gateway
- [ ] Mostrar métodos disponíveis (badges)
- [ ] Callback onSelect(gateway)

#### 2.6 React - Payment Forms

- [ ] Criar: `src/features/gateways/components/StripeCardForm.tsx`
  - [ ] Usar @stripe/stripe-js
  - [ ] CardElement do Stripe
  - [ ] Processar pagamento
- [ ] Criar: `src/features/gateways/components/PixDisplay.tsx`
  - [ ] Mostrar QR code (qrcode.react)
  - [ ] Copiar código PIX
  - [ ] Polling de status
- [ ] Criar: `src/features/gateways/components/BoletoDisplay.tsx`
  - [ ] Mostrar código de barras
  - [ ] Link para PDF

#### 2.7 Admin - Configuração de Gateways

- [ ] Criar: `src/pages/admin/Gateways.tsx`
- [ ] Lista de gateways disponíveis
- [ ] Modal de configuração por gateway:
  - [ ] Stripe: secret_key, public_key
  - [ ] Efi: client_id, client_secret, pix_key
  - [ ] Asaas: api_key
- [ ] Toggle is_active
- [ ] Selecionar allowed_methods
- [ ] Salvar credentials (criptografadas)

#### 2.8 Integração no Checkout

- [ ] Atualizar `src/pages/checkout/Checkout.tsx`
- [ ] Adicionar `<GatewaySelector />` após customer form
- [ ] State: `selectedGateway`
- [ ] Renderizar form baseado no gateway:
  - [ ] Se stripe: `<StripeCardForm />`
  - [ ] Se pix-efi: `<PixDisplay />`
  - [ ] Se asaas: `<AsaasPaymentForm />`
- [ ] Processar pagamento via Edge Function correspondente
- [ ] Salvar gateway usado no order

#### 2.9 Webhooks

- [ ] Criar: `supabase/functions/webhook-stripe/index.ts`
  - [ ] Verificar assinatura Stripe
  - [ ] Atualizar order status
- [ ] Criar: `supabase/functions/webhook-efi/index.ts`
  - [ ] Verificar webhook Efi
  - [ ] Atualizar order status
- [ ] Criar: `supabase/functions/webhook-asaas/index.ts`
  - [ ] Verificar webhook Asaas
  - [ ] Atualizar order status
- [ ] Configurar URLs nos dashboards dos gateways

#### 2.10 Testes

- [ ] Testar Stripe (cartão de teste)
- [ ] Testar PIX Efi (sandbox)
- [ ] Testar Asaas (sandbox)
- [ ] Testar webhooks de cada gateway
- [ ] Testar mudança de gateway no checkout

#### 2.11 Commit

- [ ] `git commit -m "feat: múltiplos gateways (Stripe, PIX, Asaas)"`

---

### Semana 3: Checkout Avançado (Timer + Exit Popup)

#### 3.1 Database Schema

- [ ] Criar migration: `supabase migration new checkout_advanced_config`
- [ ] Adicionar ao `products.checkout_config`:
  - [ ] timer: { enabled, minutes, text, sticky, colors }
  - [ ] exit_popup: { enabled, triggers, coupon_code, copy }
  - [ ] reviews: []
  - [ ] sales_notification: { enabled, names, interval }
- [ ] Rodar migration

**Referência Getfy:**
- `app/Models/Product.php` - método `defaultCheckoutConfig()`

#### 3.2 React - CheckoutTimer

- [ ] Criar: `src/features/checkout-advanced/components/CheckoutTimer.tsx`
- [ ] State: `timeLeft` (em segundos)
- [ ] useEffect com setInterval para countdown
- [ ] Formatar tempo: MM:SS
- [ ] Renderizar sticky ou inline (baseado em config)
- [ ] Customizar cores (background, text)
- [ ] Animação de entrada (Framer Motion)

**Referência Getfy:**
- `resources/js/components/checkout/CheckoutTimer.vue`

#### 3.3 React - ExitPopup

- [ ] Criar: `src/features/checkout-advanced/components/ExitPopup.tsx`
- [ ] Detectar triggers:
  - [ ] Mouse leave top: `document.addEventListener('mouseleave')`
  - [ ] Back button: `window.addEventListener('popstate')`
  - [ ] Tab switch: `document.addEventListener('visibilitychange')`
- [ ] State: `isOpen`, `hasShown`
- [ ] localStorage para controlar frequency_per_session
- [ ] Dialog (shadcn/ui) com copy e cupom
- [ ] Botões: Aceitar (aplicar cupom) / Recusar (fechar)

**Referência Getfy:**
- `resources/js/components/checkout/ExitPopup.vue`

#### 3.4 React - Reviews Display

- [ ] Criar: `src/features/checkout-advanced/components/CheckoutReviews.tsx`
- [ ] Renderizar lista de reviews
- [ ] Avatar, nome, rating (estrelas), texto
- [ ] Carousel se múltiplos reviews

#### 3.5 React - Sales Notification

- [ ] Criar: `src/features/checkout-advanced/components/SalesNotification.tsx`
- [ ] Mostrar notificação flutuante
- [ ] Rotacionar nomes da lista
- [ ] Intervalo configurável
- [ ] Animação de entrada/saída

#### 3.6 Admin - Configuração

- [ ] Atualizar: `src/pages/admin/Products.tsx` (ProductFormModal)
- [ ] Aba "Checkout Avançado"
- [ ] Seção Timer:
  - [ ] Toggle enabled
  - [ ] Input minutes
  - [ ] Input text
  - [ ] Color pickers (background, text)
  - [ ] Toggle sticky
- [ ] Seção Exit Popup:
  - [ ] Toggle enabled
  - [ ] Checkboxes triggers
  - [ ] Select coupon
  - [ ] Inputs: title, description, buttons
  - [ ] Input frequency_per_session
- [ ] Seção Reviews:
  - [ ] Lista de reviews
  - [ ] Adicionar/remover review
- [ ] Seção Sales Notification:
  - [ ] Toggle enabled
  - [ ] Textarea names (um por linha)
  - [ ] Input interval_seconds

#### 3.7 Integração no Checkout

- [ ] Atualizar `src/pages/checkout/Checkout.tsx`
- [ ] Buscar `product.checkout_config`
- [ ] Renderizar componentes condicionalmente:
  - [ ] `<CheckoutTimer config={config.timer} />`
  - [ ] `<ExitPopup config={config.exit_popup} onApplyCoupon={...} />`
  - [ ] `<CheckoutReviews reviews={config.reviews} />`
  - [ ] `<SalesNotification config={config.sales_notification} />`

#### 3.8 Testes

- [ ] Testar timer contando corretamente
- [ ] Testar timer sticky vs inline
- [ ] Testar exit popup em cada trigger
- [ ] Testar frequency_per_session (localStorage)
- [ ] Testar aplicação de cupom via popup
- [ ] Testar reviews display
- [ ] Testar sales notification

#### 3.9 Commit

- [ ] `git commit -m "feat: checkout avançado (timer, exit popup, reviews)"`

---

### Semana 4: Integração e Testes Fase 1

#### 4.1 Integração Completa

- [ ] Testar fluxo completo:
  - [ ] Abrir checkout
  - [ ] Timer aparecendo
  - [ ] Aplicar cupom
  - [ ] Selecionar gateway
  - [ ] Preencher dados
  - [ ] Exit popup ao tentar sair
  - [ ] Processar pagamento
  - [ ] Webhook recebido
  - [ ] Order atualizado
  - [ ] Acesso liberado

#### 4.2 Testes de Regressão

- [ ] Features existentes ainda funcionam:
  - [ ] Login/Logout
  - [ ] Dashboard
  - [ ] Cursos
  - [ ] Progresso de aulas
  - [ ] Gamificação
  - [ ] Certificados
  - [ ] Admin (todas as páginas)

#### 4.3 Ajustes de UX

- [ ] Loading states em todos os botões
- [ ] Mensagens de erro amigáveis
- [ ] Validações de formulário
- [ ] Responsividade mobile
- [ ] Acessibilidade (ARIA labels)

#### 4.4 Performance

- [ ] Lighthouse audit (Performance > 90)
- [ ] Otimizar queries (eager loading)
- [ ] Adicionar índices se necessário
- [ ] Code splitting (lazy load)

#### 4.5 Documentação

- [ ] README atualizado
- [ ] Documentar novas env vars
- [ ] Documentar setup de gateways
- [ ] Changelog

#### 4.6 Deploy Staging

- [ ] Deploy para ambiente de staging
- [ ] Testar em produção-like
- [ ] Validar webhooks em URLs públicas

#### 4.7 Commit Final Fase 1

- [ ] `git commit -m "chore: fase 1 completa - fundação comercial"`
- [ ] `git tag v1.1.0`
- [ ] `git push --tags`

---

## FASE 2: AUTOMAÇÃO E CONVERSÃO (6 semanas)

### Semana 5-6: Pixels de Conversão

#### 5.1 Preparação

- [ ] Ler prompt IA: `docs/superpowers/specs/2026-04-18-ai-prompts.md` (Prompt 2.1)
- [ ] Anexar arquivos Getfy de referência
- [ ] Gerar código com Claude/GPT

#### 5.2 Database Schema

- [ ] Criar migration: `supabase migration new conversion_pixels`
- [ ] Tabela `conversion_pixels`
- [ ] Rodar migration

#### 5.3 Edge Function - CAPI

- [ ] Criar: `supabase functions new fire-conversion-pixel`
- [ ] Implementar Meta Conversions API
- [ ] Implementar TikTok Events API
- [ ] Implementar Google Ads Conversion
- [ ] Implementar GA4 Measurement Protocol
- [ ] Hash SHA-256 para PII
- [ ] Deploy função

#### 5.4 React Hook

- [ ] Criar: `src/features/conversion-pixels/hooks/useConversionTracking.ts`
- [ ] Buscar pixels do produto
- [ ] Método trackEvent
- [ ] Client-side: injetar scripts
- [ ] Server-side: chamar Edge Function

#### 5.5 React Component

- [ ] Criar: `src/features/conversion-pixels/components/PixelTracker.tsx`
- [ ] Wrapper que injeta pixels
- [ ] Track PageView automaticamente
- [ ] Context para expor trackEvent

#### 5.6 Admin UI

- [ ] Criar: `src/pages/admin/ConversionPixels.tsx`
- [ ] Seletor de produto
- [ ] Cards por plataforma
- [ ] Forms de configuração
- [ ] Botão de teste

#### 5.7 Integração

- [ ] Envolver CheckoutPage com `<PixelTracker>`
- [ ] Track InitiateCheckout ao carregar
- [ ] Track AddPaymentInfo ao selecionar gateway
- [ ] Track Purchase ao completar pagamento

#### 5.8 Revisão Manual

- [ ] Revisar lógica de hash SHA-256
- [ ] Revisar deduplicação (event_id)
- [ ] Revisar estrutura de dados enviados
- [ ] Testar com pixels reais

#### 5.9 Testes

- [ ] Testar Meta Pixel (client + CAPI)
- [ ] Testar TikTok Pixel
- [ ] Testar Google Ads
- [ ] Testar GA4
- [ ] Validar eventos no dashboard de cada plataforma

#### 5.10 Commit

- [ ] `git commit -m "feat: pixels de conversão (Meta, TikTok, Google, GA4)"`

---

### Semana 7-8: Sistema de Assinaturas Recorrentes

#### 6.1 Preparação

- [ ] Ler prompt IA (Prompt 2.2)
- [ ] Gerar código com IA

#### 6.2 Database Schema

- [ ] Criar migration: `supabase migration new subscriptions_system`
- [ ] Tabelas: subscription_plans, subscriptions, saved_payment_methods, subscription_invoices
- [ ] Rodar migration

#### 6.3 Edge Functions

- [ ] Criar: `create-subscription`
- [ ] Criar: `renew-subscription`
- [ ] Criar: `cancel-subscription`
- [ ] Criar: `subscription-renewal-cron`
- [ ] Deploy todas

#### 6.4 React Pages

- [ ] Criar: `src/pages/admin/Subscriptions.tsx`
- [ ] Criar: `src/pages/RenewalPage.tsx` (pública)
- [ ] Criar: `src/pages/admin/SubscriptionPlans.tsx`

#### 6.5 React Hooks

- [ ] Criar: `useSubscription`
- [ ] Criar: `useSubscriptionPlans`
- [ ] Criar: `useRenewal`
- [ ] Criar: `useCancelSubscription`

#### 6.6 Integração Checkout

- [ ] Adicionar opção "Assinatura" no checkout
- [ ] Selecionar plano
- [ ] Salvar método de pagamento
- [ ] Criar assinatura via Edge Function

#### 6.7 Cron Job

- [ ] Configurar cron no Supabase (ou serviço externo)
- [ ] Chamar `subscription-renewal-cron` a cada hora
- [ ] Testar renovação automática

#### 6.8 Notificações

- [ ] Email 3 dias antes da renovação
- [ ] Email de sucesso na renovação
- [ ] Email de falha na renovação

#### 6.9 Revisão Manual

- [ ] Revisar lógica de renovação
- [ ] Revisar cálculo de períodos
- [ ] Revisar tratamento de falhas
- [ ] Revisar segurança (tokens únicos)

#### 6.10 Testes

- [ ] Criar assinatura
- [ ] Renovar manualmente
- [ ] Renovar automaticamente (cron)
- [ ] Cancelar assinatura
- [ ] Testar falha de pagamento (past_due)
- [ ] Testar trial period

#### 6.11 Commit

- [ ] `git commit -m "feat: sistema de assinaturas recorrentes"`

---

### Semana 9: Upsell/Downsell Flow

#### 7.1 Preparação

- [ ] Ler prompt IA (Prompt 2.3)
- [ ] Gerar código

#### 7.2 Database Schema

- [ ] Atualizar `products.checkout_config` com upsell/downsell

#### 7.3 Edge Function

- [ ] Criar: `process-upsell`
- [ ] Deploy

#### 7.4 React Pages

- [ ] Criar: `src/pages/checkout/UpsellPage.tsx`
- [ ] Criar: `src/pages/checkout/DownsellPage.tsx`

#### 7.5 Fluxo de Navegação

- [ ] Atualizar CheckoutPage para redirecionar para upsell após sucesso
- [ ] Implementar lógica de aceitar/recusar
- [ ] Redirecionar para downsell ou thank you

#### 7.6 Admin UI

- [ ] Adicionar seção Upsell/Downsell no ProductFormModal
- [ ] Configurar produtos, copy, imagens

#### 7.7 Testes

- [ ] Testar fluxo completo: checkout → upsell → aceitar → thank you
- [ ] Testar: checkout → upsell → recusar → downsell → aceitar
- [ ] Testar: checkout → upsell → recusar → downsell → recusar → thank you

#### 7.8 Commit

- [ ] `git commit -m "feat: upsell/downsell flow"`

---

### Semana 10: Email Marketing Básico

#### 8.1 Preparação

- [ ] Ler prompt IA (Prompt 2.4)
- [ ] Gerar código

#### 8.2 Database Schema

- [ ] Criar migration: `email_marketing`
- [ ] Tabelas: email_campaigns, email_campaign_sends, email_templates

#### 8.3 Edge Functions

- [ ] Criar: `send-campaign`
- [ ] Criar: `email-campaign-cron`
- [ ] Deploy

#### 8.4 React Pages

- [ ] Criar: `src/pages/admin/EmailCampaigns.tsx`
- [ ] Criar: `src/pages/admin/EmailCampaignEditor.tsx`

#### 8.5 Tracking

- [ ] Implementar pixel de abertura (1x1)
- [ ] Implementar link tracking

#### 8.6 Testes

- [ ] Criar campanha
- [ ] Enviar para segmento
- [ ] Verificar recebimento
- [ ] Testar tracking de abertura
- [ ] Testar tracking de clique

#### 8.7 Commit

- [ ] `git commit -m "feat: email marketing básico"`

---

## FASE 3: EXPANSÃO ENTERPRISE (6 semanas)

### Semana 11-12: API Applications

- [ ] Seguir prompt IA (Prompt 3.1)
- [ ] Implementar schema
- [ ] Implementar Edge Functions
- [ ] Implementar React pages
- [ ] Gerar documentação OpenAPI
- [ ] Testar integração completa
- [ ] Commit

### Semana 13-14: Sistema de Equipe

- [ ] Seguir prompt IA (Prompt 3.2)
- [ ] Implementar schema + RLS
- [ ] Implementar Edge Functions
- [ ] Implementar React pages
- [ ] Testar permissões
- [ ] Testar audit logs
- [ ] Commit

### Semana 15: Integrações Externas

- [ ] Implementar integração Cademí
- [ ] Implementar integração Utmify
- [ ] Implementar webhooks genéricos
- [ ] Testar cada integração
- [ ] Commit

### Semana 16: PWA Completo

- [ ] Implementar manifest dinâmico
- [ ] Implementar service worker
- [ ] Implementar push notifications
- [ ] Testar instalação
- [ ] Commit

---

## PÓS-IMPLEMENTAÇÃO

### Testes Finais

- [ ] Testes E2E completos (Playwright)
- [ ] Testes de carga (k6 ou similar)
- [ ] Testes de segurança (OWASP)
- [ ] Testes de acessibilidade (axe)

### Performance

- [ ] Lighthouse audit (todas as páginas > 90)
- [ ] Otimizar bundle size
- [ ] Otimizar queries SQL
- [ ] Configurar CDN

### Documentação

- [ ] README completo
- [ ] Guia de setup
- [ ] Guia de deploy
- [ ] API documentation
- [ ] Changelog

### Deploy Produção

- [ ] Deploy para produção
- [ ] Configurar monitoramento (Sentry)
- [ ] Configurar analytics
- [ ] Configurar backups
- [ ] Configurar alertas

### Lançamento

- [ ] Anunciar novas features
- [ ] Treinar equipe (se aplicável)
- [ ] Monitorar métricas
- [ ] Coletar feedback

---

## MÉTRICAS DE SUCESSO

### Fase 1

- [ ] Taxa de conversão aumentou +15%
- [ ] Ticket médio aumentou +20%
- [ ] Abandono de carrinho reduziu -25%

### Fase 2

- [ ] ROAS aumentou +30%
- [ ] MRR de assinaturas > R$ 10k/mês
- [ ] AOV aumentou +35%

### Fase 3

- [ ] 5+ clientes B2B usando API
- [ ] Churn reduziu -20%
- [ ] Eficiência operacional +40%

---

**Checklist completo! Boa implementação! 🚀**
