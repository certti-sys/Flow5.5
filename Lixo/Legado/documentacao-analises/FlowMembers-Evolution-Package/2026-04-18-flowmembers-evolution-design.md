# FlowMembers Evolution: Integração de Features Enterprise do Getfy

**Data:** 2026-04-18  
**Autor:** Claude (Análise e Design)  
**Versão:** 1.0  
**Status:** Aprovado para Implementação

---

## Sumário Executivo

Este documento especifica a estratégia de evolução da plataforma FlowMembers (React+Supabase) através da integração de funcionalidades enterprise validadas do Getfy (Laravel+PHP), utilizando abordagem híbrida (engenharia reversa manual + IA assistida).

**Objetivo:** Elevar FlowMembers de plataforma LMS básica para solução enterprise completa de checkout, área de membros e monetização.

**Prazo:** 4 meses (16 semanas)  
**Investimento Estimado:** R$ 40-60k (1-2 devs)  
**ROI Esperado:** +30% conversão, +35% ticket médio, MRR recorrente

---

## 1. Contexto e Motivação

### 1.1 Estado Atual

**FlowMembers (70% completo):**
- Stack: React 18 + Vite + TypeScript + Supabase
- ~11k linhas de código, 206 arquivos TS/TSX
- Features: LMS, checkout básico (MercadoPago), gamificação, webhooks, admin

**Getfy (referência):**
- Stack: Laravel 12 + Inertia.js + Vue 3
- ~20k linhas Vue, 106 migrations
- Features: 11 gateways, assinaturas, upsell/downsell, pixels, email marketing, API externa

### 1.2 Gaps Identificados

| Categoria | FlowMembers | Getfy | Gap |
|-----------|-------------|-------|-----|
| Gateways | MercadoPago | 11 gateways (Stripe, PIX, Boleto, etc) | ❌ 10 gateways |
| Checkout | Básico | Timer, exit popup, pixels, reviews | ❌ Features avançadas |
| Monetização | Pagamento único | Assinaturas recorrentes | ❌ Recorrência |
| Conversão | Order bumps | Upsell/Downsell flow | ❌ Maximização AOV |
| Marketing | Básico | Campanhas, segmentação, automação | ❌ Email marketing |
| Integrações | Webhooks | Cademí, Utmify, Spedy | ❌ Plataformas externas |
| B2B | Não | API Applications (checkout externo) | ❌ API pública |
| Gestão | Admin único | Sistema de equipe, roles, audit logs | ❌ Multi-usuário |

---

## 2. Estratégia de Implementação

### 2.1 Abordagem Híbrida

**Fase 1 (Manual):** Features críticas de monetização  
**Fase 2 (IA Assistida):** Features complexas com revisão  
**Fase 3 (Híbrida):** Features enterprise com validação dupla

### 2.2 Princípios de Design

1. **Isolamento:** Cada feature é módulo independente
2. **Compatibilidade:** Não quebrar funcionalidades existentes
3. **Progressivo:** Implementação incremental e testável
4. **Type-Safe:** TypeScript end-to-end com Zod
5. **Performance:** Edge Functions + React Query cache

### 2.3 Arquitetura Proposta

```
FlowMembers/
├── src/
│   ├── features/                    [NOVA ESTRUTURA]
│   │   ├── coupons/                 [Fase 1]
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── gateways/                [Fase 1 - Expandir]
│   │   │   ├── stripe/
│   │   │   ├── pix-native/
│   │   │   └── asaas/
│   │   ├── checkout-advanced/       [Fase 1]
│   │   │   ├── timer/
│   │   │   ├── exit-popup/
│   │   │   └── reviews/
│   │   ├── conversion-pixels/       [Fase 2]
│   │   ├── subscriptions/           [Fase 2]
│   │   ├── upsell-downsell/         [Fase 2]
│   │   ├── email-marketing/         [Fase 2]
│   │   ├── api-applications/        [Fase 3]
│   │   ├── team-management/         [Fase 3]
│   │   └── integrations/            [Fase 3]
│   └── [estrutura existente mantida]
│
├── supabase/
│   ├── migrations/                  [NOVAS TABELAS]
│   │   ├── 20260418_coupons.sql
│   │   ├── 20260418_gateway_configs.sql
│   │   ├── 20260418_subscriptions.sql
│   │   └── ...
│   └── functions/                   [NOVAS EDGE FUNCTIONS]
│       ├── validate-coupon/
│       ├── gateway-stripe/
│       ├── gateway-pix-efi/
│       ├── fire-conversion-pixel/
│       ├── create-subscription/
│       └── ...
```

---

## 3. Roadmap Detalhado

### FASE 1: Fundação Comercial (Manual) - 4 semanas

#### Semana 1: Sistema de Cupons Avançado

**Referência Getfy:**
- `app/Models/Coupon.php`
- `app/Http/Controllers/CuponsController.php`
- `database/migrations/*_create_coupons_table.php`

**Implementação:**

**1. Database Schema:**
```sql
-- Tabela principal de cupons
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text check (discount_type in ('percent', 'fixed')) not null,
  discount_value numeric not null,
  max_uses int,
  uses_count int default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  min_purchase_amount numeric default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Relação cupom-produto (many-to-many)
create table coupon_products (
  coupon_id uuid references coupons(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  primary key (coupon_id, product_id)
);

-- Histórico de uso
create table coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid references coupons(id),
  order_id uuid references orders(id),
  user_id uuid references auth.users(id),
  discount_applied numeric,
  created_at timestamptz default now()
);

-- Índices para performance
create index idx_coupons_code on coupons(code);
create index idx_coupon_usage_coupon on coupon_usage(coupon_id);
```

**2. Edge Function:**
- Arquivo: `supabase/functions/validate-coupon/index.ts`
- Lógica: Validar código, data, produto, valor mínimo, limite de uso
- Retorno: `{ valid: boolean, discount_applied: number, error?: string }`

**3. React Components:**
- `src/features/coupons/components/CouponInput.tsx`
- `src/features/coupons/hooks/useCouponValidation.ts`
- `src/pages/admin/Coupons.tsx` (CRUD completo)

**4. Integração Checkout:**
- Adicionar CouponInput no CheckoutPage
- Atualizar OrderSummary com desconto
- Salvar coupon_code no order

**Critérios de Sucesso:**
- ✅ Cupom aplicado corretamente no checkout
- ✅ Validações funcionando (data, produto, limite)
- ✅ Admin pode criar/editar/desativar cupons
- ✅ Estatísticas de uso visíveis

---

#### Semana 2: Múltiplos Gateways de Pagamento

**Referência Getfy:**
- `app/Gateways/Stripe/StripeDriver.php`
- `app/Gateways/Efi/EfiDriver.php`
- `app/Gateways/GatewayRegistry.php`

**Implementação:**

**1. Database Schema:**
```sql
create table gateway_configs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, -- 'stripe', 'pix-efi', 'asaas'
  name text not null,
  is_active boolean default true,
  credentials jsonb not null, -- encrypted
  allowed_methods text[] default array['credit_card'],
  config jsonb default '{}',
  created_at timestamptz default now()
);

-- RLS: apenas admins podem ver credentials
alter table gateway_configs enable row level security;
```

**2. Edge Functions:**

**Stripe:**
- Arquivo: `supabase/functions/gateway-stripe/index.ts`
- Métodos: createPaymentIntent, confirmPayment, createSubscription
- SDK: `stripe` npm package

**PIX Nativo (Efi):**
- Arquivo: `supabase/functions/gateway-pix-efi/index.ts`
- Métodos: generatePix, checkPixStatus
- SDK: `sdk-node-apis-efi`

**Asaas:**
- Arquivo: `supabase/functions/gateway-asaas/index.ts`
- Métodos: createPayment (card, pix, boleto)

**3. React Components:**
- `src/features/gateways/components/GatewaySelector.tsx`
- `src/features/gateways/components/StripeCardForm.tsx`
- `src/features/gateways/components/PixDisplay.tsx`
- `src/pages/admin/Gateways.tsx` (configuração)

**4. Integração Checkout:**
- Buscar gateways ativos
- Renderizar form baseado no gateway selecionado
- Processar pagamento via Edge Function correspondente

**Critérios de Sucesso:**
- ✅ Stripe funcionando (cartão)
- ✅ PIX Efi funcionando (QR code + copia e cola)
- ✅ Asaas funcionando (cartão, pix, boleto)
- ✅ Admin pode configurar credenciais
- ✅ Webhooks recebendo notificações

---

#### Semana 3: Checkout Avançado (Timer + Exit Popup)

**Referência Getfy:**
- `resources/js/components/checkout/CheckoutTimer.vue`
- `resources/js/components/checkout/ExitPopup.vue`
- `app/Models/Product.php` - `checkout_config`

**Implementação:**

**1. Database Schema:**
```sql
-- Adicionar ao products (já existe, expandir)
alter table products add column if not exists checkout_config jsonb default '{
  "timer": {
    "enabled": false,
    "minutes": 15,
    "text": "Oferta expira em:",
    "background_color": "#000000",
    "text_color": "#FFFFFF",
    "sticky": true
  },
  "exit_popup": {
    "enabled": false,
    "triggers": {
      "mouse_leave_top": true,
      "back_button": true,
      "tab_switch": false
    },
    "coupon_code": null,
    "title": "Espere! Desconto especial",
    "description": "Use o cupom abaixo na próxima etapa",
    "button_accept": "Quero o desconto",
    "button_decline": "Não, obrigado",
    "frequency_per_session": 1
  },
  "reviews": [],
  "sales_notification": {
    "enabled": false,
    "names": [],
    "interval_seconds": 10
  }
}'::jsonb;
```

**2. React Components:**

**Timer:**
- `src/features/checkout-advanced/components/CheckoutTimer.tsx`
- Countdown em tempo real
- Sticky ou inline
- Customizável (cores, texto)

**Exit Popup:**
- `src/features/checkout-advanced/components/ExitPopup.tsx`
- Detectar: mouse leave top, back button, tab switch
- Mostrar apenas 1x por sessão (localStorage)
- Aplicar cupom automaticamente se aceitar

**3. Integração:**
- Adicionar no CheckoutPage
- Ler config do produto
- Renderizar condicionalmente

**Critérios de Sucesso:**
- ✅ Timer contando corretamente
- ✅ Exit popup disparando nos triggers corretos
- ✅ Cupom aplicado ao aceitar popup
- ✅ Admin pode configurar via UI

---

#### Semana 4: Integração e Testes Fase 1

**Atividades:**
1. Integrar todas as features no checkout existente
2. Testes E2E (Playwright)
3. Testes de regressão
4. Ajustes de UX
5. Documentação

**Checklist:**
- ✅ Fluxo completo: produto → checkout → cupom → gateway → pagamento
- ✅ Todos os gateways testados em sandbox
- ✅ Timer e exit popup funcionando
- ✅ Admin pode gerenciar tudo
- ✅ Sem regressões em features existentes

---

### FASE 2: Automação e Conversão (IA Assistida) - 6 semanas

#### Semana 5-6: Pixels de Conversão

**Estratégia IA:**
- Usar Claude para gerar código base
- Revisar manualmente lógica crítica
- Testar com pixels reais

**Features:**
- Meta Pixel (client + CAPI)
- TikTok Pixel (client + Events API)
- Google Ads Conversion
- GA4 Measurement Protocol

**Deliverables:**
- Tabela `conversion_pixels`
- Edge Function `fire-conversion-pixel`
- Componente `PixelTracker`
- Admin UI para configuração

---

#### Semana 7-8: Sistema de Assinaturas Recorrentes

**Estratégia IA:**
- Prompt estruturado com contexto Getfy
- Gerar schema + Edge Functions
- Revisar lógica de renovação

**Features:**
- Planos (mensal, trimestral, anual)
- Renovação automática (cron)
- Gestão de cartões salvos
- Página de renovação manual
- Webhooks de status

**Deliverables:**
- Tabelas: `subscription_plans`, `subscriptions`, `saved_payment_methods`
- Edge Functions: `create-subscription`, `renew-subscription`
- Cron: `subscription-renewal-cron`
- Admin UI + Página pública de renovação

---

#### Semana 9: Upsell/Downsell Flow

**Estratégia IA:**
- Analisar fluxo Getfy
- Gerar páginas de oferta
- Implementar lógica de cobrança

**Features:**
- Página de upsell pós-compra
- Página de downsell se recusar
- Cobrança com mesmo método
- Configuração por produto

**Deliverables:**
- Páginas: `UpsellPage`, `DownsellPage`
- Edge Function: `process-upsell`
- Atualizar checkout_config

---

#### Semana 10: Email Marketing Básico

**Estratégia IA:**
- Gerar CRUD de campanhas
- Implementar segmentação
- Integrar com Brevo (já existe)

**Features:**
- Campanhas segmentadas
- Editor HTML simples
- Agendamento
- Tracking (aberturas, cliques)

**Deliverables:**
- Tabelas: `email_campaigns`, `email_campaign_sends`
- Edge Function: `send-campaign`
- Cron: processar agendadas
- Admin UI

---

### FASE 3: Expansão Enterprise (Híbrida) - 6 semanas

#### Semana 11-12: API Applications

**Features:**
- Checkout hospedado via API
- Credenciais (API Key + Secret)
- Webhooks de retorno
- Customização (logo, cores)

---

#### Semana 13-14: Sistema de Equipe

**Features:**
- Roles e permissões
- Audit logs
- RLS (Row Level Security)
- Multi-tenant

---

#### Semana 15: Integrações Externas

**Features:**
- Cademí (entrega externa)
- Utmify (rastreamento)
- Webhooks genéricos

---

#### Semana 16: PWA Completo

**Features:**
- Manifest dinâmico
- Service Worker
- Push notifications
- Instalável

---

## 4. Métricas de Sucesso

### KPIs por Fase

**Fase 1:**
- Taxa de conversão: +15%
- Ticket médio: +20%
- Abandono de carrinho: -25%

**Fase 2:**
- ROAS: +30%
- MRR: R$ 10k+/mês
- AOV: +35%

**Fase 3:**
- Clientes B2B: 5+
- Churn: -20%
- Eficiência operacional: +40%

---

## 5. Riscos e Mitigações

| Risco | Prob | Impacto | Mitigação |
|-------|------|---------|-----------|
| Regressão features existentes | Média | Alto | Testes E2E obrigatórios |
| Lógica incorreta (IA) | Média | Alto | Code review manual |
| Bugs em gateways | Alta | Crítico | Sandbox completo |
| Performance degradada | Baixa | Médio | Profiling contínuo |
| Custo Supabase | Baixa | Médio | Monitorar uso |

---

## 6. Próximos Passos

1. ✅ Aprovar este design
2. ⏳ Gerar prompts IA para Fase 2
3. ⏳ Criar checklist de implementação
4. ⏳ Implementar exemplo completo (cupons)
5. ⏳ Iniciar Fase 1

---

## Apêndices

### A. Referências Getfy

**Arquivos Principais:**
- Models: `app/Models/{Product,Order,Coupon,Subscription}.php`
- Controllers: `app/Http/Controllers/{Checkout,Cupons,Assinaturas}Controller.php`
- Gateways: `app/Gateways/{Stripe,Efi,MercadoPago}Driver.php`
- Frontend: `resources/js/Pages/Checkout/*.vue`

### B. Stack Técnica

**FlowMembers:**
- React 18.3.1
- Vite 7.3.1
- TypeScript 5.8.3
- Supabase 2.84.0
- TanStack Query 5.83.0
- shadcn/ui + Radix UI
- Tailwind CSS 3.4.17

**Supabase:**
- PostgreSQL 15
- Edge Functions (Deno)
- Realtime
- Storage
- Auth

### C. Convenções de Código

**Nomenclatura:**
- Componentes: PascalCase (`CouponInput.tsx`)
- Hooks: camelCase com `use` (`useCouponValidation.ts`)
- Tipos: PascalCase (`CouponValidationResult`)
- Edge Functions: kebab-case (`validate-coupon`)

**Estrutura de Feature:**
```
features/
└── feature-name/
    ├── components/
    ├── hooks/
    ├── types/
    ├── utils/
    └── index.ts (exports públicos)
```

---

**Documento aprovado para implementação.**
