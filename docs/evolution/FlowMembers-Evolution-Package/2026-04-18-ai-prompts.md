# Prompts Estruturados para IA - FlowMembers Evolution

**Versão:** 1.0  
**Data:** 2026-04-18  
**Uso:** Copiar e colar no Claude/GPT para gerar código

---

## Como Usar Este Documento

1. Escolha a feature que quer implementar
2. Copie o prompt correspondente
3. Cole no Claude Code, Claude.ai ou ChatGPT
4. Anexe os arquivos de referência do Getfy mencionados
5. Revise o código gerado manualmente
6. Teste antes de integrar

---

## FASE 1: Prompts Manuais (Referência)

### Prompt 1.1: Sistema de Cupons Avançado

```
CONTEXTO:
Estou evoluindo a plataforma FlowMembers (React+Vite+TypeScript+Supabase) adicionando sistema de cupons avançado baseado no Getfy (Laravel+PHP).

STACK FLOWMEMBERS:
- Frontend: React 18, TypeScript, TanStack Query, shadcn/ui, Tailwind
- Backend: Supabase (PostgreSQL + Edge Functions Deno)
- Estrutura: Feature-based (src/features/)
- Padrões: Hooks customizados, Zod validation, Type-safe

REFERÊNCIA GETFY:
Analise estes arquivos do Getfy para extrair a lógica de negócio:
- app/Models/Coupon.php (modelo e relações)
- app/Http/Controllers/CuponsController.php (validação e aplicação)
- database/migrations/*_create_coupons_table.php (schema)

REQUISITOS:
1. Cupons com desconto percentual ou fixo
2. Validações: data (valid_from, valid_until), produto específico, valor mínimo, limite de uso
3. Histórico de uso (quem usou, quando, quanto de desconto)
4. Admin CRUD completo
5. Integração no checkout existente

GERE:

1. SCHEMA SUPABASE (SQL):
   - Tabela coupons (id, code, discount_type, discount_value, max_uses, uses_count, valid_from, valid_until, min_purchase_amount, is_active)
   - Tabela coupon_products (many-to-many com products)
   - Tabela coupon_usage (histórico)
   - Índices para performance
   - RLS policies (apenas admins criam/editam)

2. EDGE FUNCTION (TypeScript/Deno):
   Arquivo: supabase/functions/validate-coupon/index.ts
   - Input: { code: string, productId: string, amount: number, userId?: string }
   - Validações: código existe, está ativo, data válida, produto válido, valor mínimo, limite de uso
   - Output: { valid: boolean, discount_applied: number, coupon?: object, error?: string }
   - Usar Zod para validação de input

3. REACT HOOK:
   Arquivo: src/features/coupons/hooks/useCouponValidation.ts
   - useMutation do TanStack Query
   - Chamar Edge Function
   - Retornar resultado tipado

4. COMPONENTE REACT:
   Arquivo: src/features/coupons/components/CouponInput.tsx
   - Input para código do cupom
   - Botão "Aplicar"
   - Loading state
   - Mensagens de erro/sucesso (toast)
   - Props: { productId, amount, onApply: (result) => void }

5. ADMIN PAGE:
   Arquivo: src/pages/admin/Coupons.tsx
   - Tabela com lista de cupons
   - Filtros e busca
   - Modal de criação/edição
   - Estatísticas de uso
   - Ações: ativar/desativar, editar, deletar

6. TIPOS TYPESCRIPT:
   Arquivo: src/features/coupons/types/index.ts
   - Interface Coupon
   - Type CouponValidationResult
   - Type CouponFormData

IMPORTANTE:
- Seguir padrões FlowMembers (shadcn/ui components)
- Type-safe completo
- Error handling robusto
- Comentários explicativos em lógica complexa
```

---

## FASE 2: Prompts IA Assistida

### Prompt 2.1: Pixels de Conversão (Meta, TikTok, Google)

```
CONTEXTO:
Implementar sistema de pixels de conversão para FlowMembers baseado no Getfy.

STACK FLOWMEMBERS:
- Frontend: React 18, TypeScript, TanStack Query, shadcn/ui
- Backend: Supabase (PostgreSQL + Edge Functions Deno)
- Estrutura: src/features/conversion-pixels/

REFERÊNCIA GETFY:
Analise estes arquivos:
- app/Models/Product.php (campo conversion_pixels, método getConversionPixelsAttribute)
- resources/js/components/checkout/ConversionPixels.vue (client-side tracking)
- app/Http/Controllers/CheckoutController.php (método fireConversionPixels - CAPI)

REQUISITOS:
1. Suportar: Meta Pixel, TikTok Pixel, Google Ads, GA4
2. Client-side tracking (browser) + Server-side (CAPI)
3. Eventos: PageView, InitiateCheckout, AddPaymentInfo, Purchase
4. Múltiplos pixels por plataforma
5. Deduplicação via event_id único
6. Configuração no admin por produto

GERE:

1. SCHEMA SUPABASE:
   - Tabela conversion_pixels (id, product_id, platform, pixel_id, access_token, config, is_active)
   - Índices

2. EDGE FUNCTION - CAPI:
   Arquivo: supabase/functions/fire-conversion-pixel/index.ts
   - Suportar Meta Conversions API
   - Suportar TikTok Events API
   - Suportar Google Ads Conversion
   - Suportar GA4 Measurement Protocol
   - Hash SHA-256 para PII (email, phone)
   - Input: { platform, pixel_id, access_token, event_name, event_id, user_data, custom_data }
   - Fazer requisições HTTP para APIs externas

3. REACT HOOK:
   Arquivo: src/features/conversion-pixels/hooks/useConversionTracking.ts
   - Buscar pixels do produto
   - Método trackEvent(eventName, eventData)
   - Client-side: injetar scripts (fbq, ttq, gtag)
   - Server-side: chamar Edge Function para CAPI
   - Gerar event_id único
   - Capturar cookies (_fbc, _fbp)

4. COMPONENTE WRAPPER:
   Arquivo: src/features/conversion-pixels/components/PixelTracker.tsx
   - Wrapper que injeta pixels
   - Track PageView automaticamente
   - Expor trackEvent via context

5. ADMIN UI:
   Arquivo: src/pages/admin/ConversionPixels.tsx
   - Seletor de produto
   - Cards por plataforma (Meta, TikTok, Google Ads, GA4)
   - Form para configurar cada pixel
   - Testar pixel (botão de teste)

6. TIPOS:
   - Interface ConversionPixel
   - Type Platform = 'meta' | 'tiktok' | 'google_ads' | 'ga4'
   - Type EventName = 'PageView' | 'InitiateCheckout' | 'Purchase' | ...

IMPORTANTE:
- Meta CAPI requer hash SHA-256 de email/phone
- Event_id deve ser único para deduplicação
- Testar com pixels reais em sandbox
- Documentar limitações de cada plataforma
```

---

### Prompt 2.2: Sistema de Assinaturas Recorrentes

```
CONTEXTO:
Implementar sistema completo de assinaturas recorrentes para FlowMembers baseado no Getfy.

STACK FLOWMEMBERS:
- Frontend: React 18, TypeScript, TanStack Query, shadcn/ui
- Backend: Supabase (PostgreSQL + Edge Functions Deno)
- Gateways: Stripe, MercadoPago (já integrados)

REFERÊNCIA GETFY:
Analise:
- app/Models/Subscription.php
- app/Models/SubscriptionPlan.php
- app/Models/SavedPaymentMethod.php
- app/Http/Controllers/RenewalController.php
- app/Services/EfiPixRecorrenteService.php
- app/Console/Commands/ReconcilePendingPaymentsCommand.php

REQUISITOS:
1. Planos: mensal, trimestral, anual
2. Renovação automática via cron
3. Gestão de cartões salvos
4. Status: active, cancelled, past_due, trialing
5. Página de renovação manual (token único)
6. Webhooks de status
7. Notificações de renovação
8. Trial period opcional

GERE:

1. SCHEMA SUPABASE:
   - Tabela subscription_plans (id, product_id, name, billing_period, price, trial_days, is_active)
   - Tabela subscriptions (id, user_id, product_id, subscription_plan_id, status, current_period_start, current_period_end, cancel_at_period_end, gateway_subscription_id, renewal_token, saved_payment_method_id)
   - Tabela saved_payment_methods (id, user_id, gateway, gateway_payment_method_id, type, last4, brand, exp_month, exp_year, is_default)
   - Tabela subscription_invoices (id, subscription_id, amount, status, due_date, paid_at, gateway_invoice_id)

2. EDGE FUNCTIONS:

   A) create-subscription/index.ts
   - Input: { userId, planId, paymentMethodId, gateway }
   - Criar assinatura no gateway (Stripe ou MercadoPago)
   - Salvar no banco
   - Dar acesso ao produto
   - Gerar renewal_token único

   B) renew-subscription/index.ts
   - Input: { subscriptionId }
   - Buscar assinatura e método de pagamento
   - Cobrar no gateway
   - Se sucesso: atualizar período, criar invoice
   - Se falha: marcar como past_due, notificar usuário

   C) cancel-subscription/index.ts
   - Input: { subscriptionId, immediate: boolean }
   - Se immediate: cancelar agora
   - Se não: marcar cancel_at_period_end = true

   D) subscription-renewal-cron/index.ts
   - Buscar assinaturas que vencem em 24h
   - Chamar renew-subscription para cada uma
   - Enviar emails de falha

3. REACT PAGES:

   A) src/pages/admin/Subscriptions.tsx
   - Tabela de assinaturas
   - Filtros por status
   - Ações: cancelar, ver invoices
   - Métricas: MRR, churn rate

   B) src/pages/RenewalPage.tsx (pública)
   - Recebe token na URL
   - Buscar assinatura pelo token
   - Mostrar detalhes do plano
   - Form de pagamento
   - Processar renovação

4. HOOKS:
   - useSubscription(subscriptionId)
   - useSubscriptionPlans(productId)
   - useRenewal(token)
   - useCancelSubscription()

5. TIPOS:
   - Interface Subscription
   - Interface SubscriptionPlan
   - Interface SavedPaymentMethod
   - Type SubscriptionStatus
   - Type BillingPeriod

IMPORTANTE:
- Cron deve rodar a cada hora
- Notificar usuário 3 dias antes da renovação
- Permitir atualizar método de pagamento
- Webhook handlers para cada gateway
- Logs detalhados de renovações
```

---

### Prompt 2.3: Upsell/Downsell Flow

```
CONTEXTO:
Implementar fluxo de upsell/downsell pós-compra para FlowMembers baseado no Getfy.

STACK FLOWMEMBERS:
- Frontend: React 18, TypeScript, React Router, Framer Motion
- Backend: Supabase Edge Functions

REFERÊNCIA GETFY:
- app/Http/Controllers/UpsellController.php
- resources/js/Pages/Checkout/Upsell.vue
- resources/js/Pages/Checkout/Downsell.vue
- app/Models/Product.php (checkout_config.upsell, checkout_config.downsell)

REQUISITOS:
1. Após compra bem-sucedida, redirecionar para página de upsell
2. Se aceitar: cobrar com mesmo método de pagamento
3. Se recusar: mostrar downsell (produto mais barato)
4. Se recusar downsell: ir para thank you page
5. Configurável por produto (qual produto oferecer, copy, imagens)
6. One-click purchase (sem preencher dados novamente)

GERE:

1. SCHEMA:
   - Adicionar ao products.checkout_config:
     {
       "upsell": {
         "enabled": boolean,
         "product_id": uuid,
         "product_offer_id": uuid,
         "title": string,
         "subtitle": string,
         "body_text": html,
         "hero_image": url,
         "hero_video_url": url,
         "button_accept": string,
         "button_decline": string
       },
       "downsell": { ... }
     }

2. EDGE FUNCTION:
   Arquivo: supabase/functions/process-upsell/index.ts
   - Input: { orderId, upsellProductId, paymentMethodId }
   - Buscar order original
   - Criar novo order para upsell
   - Cobrar com mesmo método de pagamento
   - Dar acesso ao produto
   - Retornar sucesso/erro

3. REACT PAGES:

   A) src/pages/checkout/UpsellPage.tsx
   - Receber orderId via URL
   - Buscar order e config de upsell
   - Mostrar oferta (hero, copy, preço)
   - Botões: Aceitar / Recusar
   - Animações (Framer Motion)
   - Se aceitar: processar e ir para thank you
   - Se recusar: ir para downsell (se configurado)

   B) src/pages/checkout/DownsellPage.tsx
   - Similar ao upsell
   - Oferta mais barata
   - Se recusar: ir para thank you

4. FLUXO DE NAVEGAÇÃO:
   - Checkout success → UpsellPage
   - Upsell accept → ThankYouPage
   - Upsell decline → DownsellPage (se configurado) ou ThankYouPage
   - Downsell accept → ThankYouPage
   - Downsell decline → ThankYouPage

5. ADMIN UI:
   - Adicionar seção "Upsell/Downsell" no ProductFormModal
   - Toggle enable/disable
   - Seletor de produto
   - Editor de copy
   - Upload de imagem/vídeo

IMPORTANTE:
- Não pedir dados de pagamento novamente
- Mostrar produto já comprado na página
- Animações suaves (não agressivas)
- Tracking de conversão de upsell
```

---

### Prompt 2.4: Email Marketing Básico

```
CONTEXTO:
Implementar sistema de email marketing para FlowMembers baseado no Getfy.

STACK FLOWMEMBERS:
- Frontend: React 18, TypeScript
- Backend: Supabase Edge Functions
- Email: Brevo (já integrado)

REFERÊNCIA GETFY:
- app/Models/EmailCampaign.php
- app/Http/Controllers/EmailMarketingController.php
- app/Console/Commands/ProcessEmailCampaignsCommand.php

REQUISITOS:
1. Campanhas segmentadas (todos, alunos de curso X, compradores)
2. Editor HTML simples
3. Agendamento
4. Estatísticas (enviados, abertos, clicados)
5. Templates salvos
6. Variáveis dinâmicas ({nome}, {email}, {produto})

GERE:

1. SCHEMA:
   - Tabela email_campaigns (id, name, subject, body_html, segment, segment_filter, scheduled_at, sent_at, status)
   - Tabela email_campaign_sends (id, campaign_id, user_id, sent_at, opened_at, clicked_at)
   - Tabela email_templates (id, name, body_html)

2. EDGE FUNCTIONS:

   A) send-campaign/index.ts
   - Input: { campaignId }
   - Buscar campanha
   - Resolver segmento (query SQL)
   - Para cada usuário:
     - Substituir variáveis
     - Enviar via Brevo
     - Registrar em email_campaign_sends
   - Atualizar status da campanha

   B) email-campaign-cron/index.ts
   - Buscar campanhas agendadas (scheduled_at <= now, status = 'scheduled')
   - Chamar send-campaign para cada uma

3. REACT PAGES:

   A) src/pages/admin/EmailCampaigns.tsx
   - Lista de campanhas
   - Botão criar nova
   - Estatísticas: taxa de abertura, cliques
   - Ações: editar, duplicar, deletar

   B) src/pages/admin/EmailCampaignEditor.tsx
   - Form: nome, assunto, segmento
   - Editor HTML (TinyMCE ou similar)
   - Preview
   - Variáveis disponíveis
   - Agendar ou enviar agora

4. TRACKING:
   - Pixel 1x1 para aberturas (GET /email/track/{send_id}/open.png)
   - Links com tracking (GET /email/track/{send_id}/click?url=...)

5. TIPOS:
   - Interface EmailCampaign
   - Type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent'
   - Type Segment = 'all' | 'course' | 'buyers'

IMPORTANTE:
- Rate limiting (não enviar todos de uma vez)
- Unsubscribe link obrigatório
- Respeitar opt-out
- Logs de envio
```

---

## FASE 3: Prompts Híbridos

### Prompt 3.1: API Applications (Checkout Externo)

```
CONTEXTO:
Implementar API pública para checkout hospedado, permitindo terceiros integrarem FlowMembers.

STACK FLOWMEMBERS:
- Frontend: React 18, TypeScript
- Backend: Supabase Edge Functions
- Auth: API Key + Secret

REFERÊNCIA GETFY:
- app/Models/ApiApplication.php
- app/Http/Controllers/ApiApplicationsController.php
- app/Http/Controllers/ApiCheckoutController.php
- resources/js/Pages/ApiCheckout/Show.vue

REQUISITOS:
1. Cliente cria API Application no admin
2. Recebe API Key + Secret
3. Endpoint: POST /api/v1/checkout-sessions
4. Retorna session_token
5. Cliente redireciona para /api-checkout/{token}
6. FlowMembers processa pagamento
7. Webhook notifica cliente
8. Customização (logo, cores, sidebar)

GERE:

1. SCHEMA:
   - Tabela api_applications (id, name, api_key, api_secret_hash, webhook_url, webhook_secret, logo_url, checkout_sidebar_bg, default_return_url, is_active)
   - Tabela api_checkout_sessions (id, api_application_id, session_token, product_id, customer_data, return_url, expires_at, order_id, status)

2. EDGE FUNCTIONS:

   A) api/v1/checkout-sessions/create.ts
   - Auth: Bearer {api_key}:{api_secret}
   - Input: { product_id, customer: { name, email, phone, cpf }, amount, return_url }
   - Validar credenciais
   - Criar session (token único, expires 1h)
   - Retornar: { session_token, checkout_url }

   B) api/v1/checkout-sessions/status.ts
   - Auth: Bearer {api_key}:{api_secret}
   - Input: { session_token }
   - Retornar: { status, order_id, payment_status }

   C) api-checkout-webhook/index.ts
   - Quando order é pago
   - Buscar api_checkout_session
   - Enviar webhook para cliente
   - Assinar com HMAC SHA-256

3. REACT PAGES:

   A) src/pages/admin/ApiApplications.tsx
   - Lista de applications
   - Criar nova
   - Ver API Key/Secret (mostrar uma vez)
   - Regenerar secret
   - Logs de uso

   B) src/pages/ApiCheckoutPage.tsx (pública)
   - Receber token na URL
   - Buscar session
   - Renderizar checkout customizado (logo, cores)
   - Processar pagamento
   - Redirecionar para return_url

4. DOCUMENTAÇÃO:
   - Gerar OpenAPI spec
   - Exemplos de integração (curl, JavaScript, Python)

IMPORTANTE:
- Rate limiting por API Key
- Logs de todas as requisições
- Webhook retry logic (3 tentativas)
- Validar assinatura HMAC no webhook
```

---

### Prompt 3.2: Sistema de Equipe (Roles & Permissions)

```
CONTEXTO:
Implementar sistema de equipe com roles e permissões para FlowMembers.

STACK FLOWMEMBERS:
- Frontend: React 18, TypeScript
- Backend: Supabase (RLS)

REFERÊNCIA GETFY:
- app/Models/TeamRole.php
- app/Models/TeamAuditLog.php
- database/migrations/*_create_team_roles_table.php

REQUISITOS:
1. Roles: Admin, Manager, Support, Viewer
2. Permissões granulares (products.create, orders.view, etc)
3. Audit logs (quem fez o quê)
4. RLS (cada usuário vê só o que pode)
5. Convites por email

GERE:

1. SCHEMA:
   - Tabela team_roles (id, name, permissions jsonb, is_system)
   - Tabela team_members (id, user_id, role_id, invited_by, invited_at, accepted_at)
   - Tabela team_audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
   - RLS policies para todas as tabelas

2. PERMISSIONS STRUCTURE:
   {
     "products": ["view", "create", "edit", "delete"],
     "orders": ["view", "edit", "refund"],
     "students": ["view", "create", "edit", "suspend"],
     "settings": ["view", "edit"],
     "team": ["view", "invite", "remove"]
   }

3. RLS POLICIES:
   - Exemplo: products só visíveis se user tem permission "products.view"
   - Usar function check_permission(user_id, permission)

4. EDGE FUNCTION:
   - check-permission/index.ts
   - audit-log/index.ts (registrar ação)

5. REACT:
   - Hook: usePermissions()
   - Hook: useHasPermission(permission)
   - Component: PermissionGate
   - Page: src/pages/admin/Team.tsx

IMPORTANTE:
- Admin sempre tem todas as permissões
- Audit log automático (trigger)
- Não permitir remover último admin
```

---

## Template de Prompt Genérico

Use este template para qualquer feature não listada:

```
CONTEXTO:
Implementar [FEATURE] para FlowMembers baseado no Getfy.

STACK FLOWMEMBERS:
- Frontend: React 18, TypeScript, TanStack Query, shadcn/ui
- Backend: Supabase (PostgreSQL + Edge Functions Deno)
- Estrutura: src/features/[feature-name]/

REFERÊNCIA GETFY:
Analise estes arquivos:
- [listar arquivos PHP relevantes]

REQUISITOS:
[listar requisitos funcionais]

GERE:

1. SCHEMA SUPABASE:
   [descrever tabelas necessárias]

2. EDGE FUNCTIONS:
   [descrever funções necessárias]

3. REACT COMPONENTS/PAGES:
   [descrever UI necessária]

4. HOOKS:
   [descrever hooks customizados]

5. TIPOS TYPESCRIPT:
   [descrever interfaces/types]

IMPORTANTE:
[considerações especiais]
```

---

## Checklist de Revisão Pós-IA

Após gerar código com IA, sempre revisar:

- [ ] Tipos TypeScript completos e corretos
- [ ] Validação Zod em Edge Functions
- [ ] Error handling robusto
- [ ] Loading states em UI
- [ ] Mensagens de erro amigáveis
- [ ] RLS policies corretas
- [ ] Índices de banco para performance
- [ ] Testes unitários (opcional mas recomendado)
- [ ] Comentários em lógica complexa
- [ ] Seguir padrões FlowMembers

---

**Fim dos Prompts. Use com responsabilidade e sempre revise o código gerado!**
