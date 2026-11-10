-- ==============================================================================
-- MIGRATION: Módulo de Pagamentos (Payment Module)
-- Data: 2026-01-12
-- Descrição: Criação de tabelas para suporte a múltiplos gateways, produtos,
-- pedidos, pagamentos, assinaturas e entitlements.
-- ==============================================================================

-- 1. TABELA: gateways
-- Armazena os provedores disponíveis (Stripe, Mercado Pago, etc.)
CREATE TABLE IF NOT EXISTS public.gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- 'stripe', 'mercadopago', 'asaas'
    slug TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gateways ENABLE ROW LEVEL SECURITY;

-- 2. TABELA: gateway_credentials
-- Armazena segredos de API por ambiente (test/live)
-- ATENÇÃO: RLS Estrito será aplicado aqui.
CREATE TABLE IF NOT EXISTS public.gateway_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id UUID REFERENCES public.gateways(id) ON DELETE CASCADE NOT NULL,
    env TEXT NOT NULL CHECK (env IN ('test', 'live')),
    public_key TEXT,
    secret_key TEXT, -- Chave sensível
    webhook_secret TEXT, -- Chave sensível
    extra_config JSONB DEFAULT '{}'::jsonb, -- Configurações extras
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(gateway_id, env)
);

ALTER TABLE public.gateway_credentials ENABLE ROW LEVEL SECURITY;

-- 3. TABELA: products
-- Produtos vendáveis (Curso avulso ou Assinatura)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    type TEXT NOT NULL CHECK (type IN ('one_time', 'subscription')),
    
    -- Configuração visual do checkout (Banner, cores, etc)
    checkout_config JSONB DEFAULT '{
        "banner_url": null, 
        "logo_url": null, 
        "primary_color": "#7C3AED", 
        "features": []
    }'::jsonb,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 4. TABELA: prices
-- Preços associados aos produtos (ex: Mensal, Anual, Vitalício)
CREATE TABLE IF NOT EXISTS public.prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    nickname TEXT, -- "Plano Anual"
    currency TEXT DEFAULT 'BRL',
    unit_amount INTEGER NOT NULL, -- Em centavos (R$ 10,00 = 1000)
    
    type TEXT NOT NULL CHECK (type IN ('one_time', 'recurring')),
    interval TEXT CHECK (interval IN ('day', 'week', 'month', 'year')),
    interval_count INTEGER DEFAULT 1,
    trial_period_days INTEGER DEFAULT 0,
    
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

-- 5. TABELA: orders
-- O "carrinho" fechado. Registra a intenção de compra.
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Pode ser nulo se checkout for "guest" (futuro), mas aqui exigimos auth
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'paid', 'failed', 'canceled', 'expired')),
    currency TEXT DEFAULT 'BRL',
    total_amount INTEGER NOT NULL, -- Soma dos itens
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 6. TABELA: order_items
-- Itens dentro do pedido (Produto principal + Order Bumps)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    price_id UUID REFERENCES public.prices(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1,
    unit_amount INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    kind TEXT DEFAULT 'main' CHECK (kind IN ('main', 'order_bump')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 7. TABELA: payments
-- Tentativas de pagamento reais no gateway
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    gateway_id UUID REFERENCES public.gateways(id) ON DELETE SET NULL,
    
    external_payment_id TEXT, -- ID no Stripe/MP
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'processing')),
    
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'BRL',
    payment_method_type TEXT, -- 'credit_card', 'pix', 'boleto'
    
    raw_response JSONB, -- Resposta completa do gateway (audit)
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 8. TABELA: subscriptions
-- Assinaturas recorrentes
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    price_id UUID REFERENCES public.prices(id) ON DELETE SET NULL,
    gateway_id UUID REFERENCES public.gateways(id) ON DELETE SET NULL,
    
    external_subscription_id TEXT, -- ID no gateway
    status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('trialling', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused')),
    
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 9. TABELA: entitlements
-- O que o usuário TEM direito de acessar. A "fonte da verdade" para permissões.
CREATE TABLE IF NOT EXISTS public.entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- O entitlement pode vir de um pedido único ou assinatura
    source_type TEXT NOT NULL CHECK (source_type IN ('order', 'subscription', 'manual')),
    source_id UUID NOT NULL, -- order_id ou subscription_id
    
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ, -- Null para lifetime
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

-- 10. TABELA: webhook_events
-- Log de todos os webhooks recebidos para idempotência e debug
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id UUID REFERENCES public.gateways(id) ON DELETE SET NULL,
    
    event_type TEXT NOT NULL,
    external_event_id TEXT, -- ID único do evento no gateway
    payload JSONB NOT NULL,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
    processing_error TEXT,
    
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(gateway_id, external_event_id) -- Previne processamento duplo
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- 11. TABELA: audit_logs
-- Auditoria de ações críticas
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Quem fez
    action TEXT NOT NULL, -- 'create_product', 'refund_payment'
    entity TEXT NOT NULL, -- 'payment', 'order'
    entity_id UUID NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------------
-- POLÍTICAS RLS (Row Level Security)
-------------------------------------------------------------------------------

-- Gateways (Public Read, Admin Write)
CREATE POLICY "Public read gateways" ON public.gateways FOR SELECT USING (true);
CREATE POLICY "Admin manage gateways" ON public.gateways FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Gateway Credentials (ADMIN ONLY - Sensitive!)
-- Service Role bypasses RLS, so Edge Functions are safe.
CREATE POLICY "Admin manage credentials" ON public.gateway_credentials FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Products & Prices (Public Read, Admin Write)
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read prices" ON public.prices FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage prices" ON public.prices FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Orders (User view own logic, Admin view all)
CREATE POLICY "User view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin view all orders" ON public.orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
-- Orders creation handled by Edge Functions usually, or User insert pending.
CREATE POLICY "User create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Order Items
CREATE POLICY "User view own order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admin view all order items" ON public.order_items FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Payments
CREATE POLICY "User view own payments" ON public.payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admin view all payments" ON public.payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Subscriptions
CREATE POLICY "User view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin view all subscriptions" ON public.subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Entitlements
CREATE POLICY "User view own entitlements" ON public.entitlements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin view all entitlements" ON public.entitlements FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Webhook Events (System/Admin only)
CREATE POLICY "Admin view webhooks" ON public.webhook_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Audit Logs (Admin only)
CREATE POLICY "Admin view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));


-------------------------------------------------------------------------------
-- DADOS INICIAIS (Seed)
-------------------------------------------------------------------------------

INSERT INTO public.gateways (name, slug, is_active, is_default)
VALUES 
    ('Mercado Pago', 'mercadopago', true, true),
    ('Stripe', 'stripe', false, false),
    ('Asaas', 'asaas', false, false)
ON CONFLICT (slug) DO NOTHING;
