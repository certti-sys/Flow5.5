-- Supabase Baseline Sync - 2026-04-05
-- This file was automatically generated to reflect the production state.

-- 1. Custom Types & Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Tables

-- public.profiles
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL,
    whatsapp text,
    avatar_url text,
    member_since timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text])),
    suspended_at timestamptz,
    suspended_by uuid REFERENCES auth.users(id),
    suspension_reason text
);
COMMENT ON COLUMN public.profiles.status IS 'User account status: active or suspended';

-- public.user_roles
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role DEFAULT 'user'::app_role,
    created_at timestamptz DEFAULT now()
);

-- public.courses
CREATE TABLE public.courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    thumbnail text NOT NULL,
    category text NOT NULL,
    instructor text NOT NULL,
    duration text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    show_card_overlay boolean DEFAULT true,
    checkout_url text,
    show_category_badge boolean DEFAULT true
);

-- public.modules
CREATE TABLE public.modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    title text NOT NULL,
    order_index integer NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- public.lessons
CREATE TABLE public.lessons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
    title text NOT NULL,
    duration text,
    video_url text,
    order_index integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    description text,
    is_public boolean DEFAULT true
);

-- public.user_progress
CREATE TABLE public.user_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed boolean DEFAULT false,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- public.comments
CREATE TABLE public.comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE
);

-- public.carousels
CREATE TABLE public.carousels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    type text NOT NULL CHECK (type = ANY (ARRAY['auto'::text, 'manual'::text])),
    category text,
    is_active boolean DEFAULT true,
    order_index integer DEFAULT 0,
    cards_per_view_desktop integer DEFAULT 5,
    cards_per_view_mobile integer DEFAULT 2,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    cards_per_view_tablet integer DEFAULT 3
);

-- public.carousel_courses
CREATE TABLE public.carousel_courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    carousel_id uuid REFERENCES public.carousels(id) ON DELETE CASCADE,
    course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    order_index integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- public.theme_settings
CREATE TABLE public.theme_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_color text NOT NULL,
    color_palette jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- public.platform_settings
CREATE TABLE public.platform_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    banner_badge_text text DEFAULT '✨ Nova Experiência de Aprendizado'::text,
    banner_title_line1 text DEFAULT 'Inspire-se,'::text,
    banner_title_line2 text DEFAULT 'Aprenda,'::text,
    banner_title_line3 text DEFAULT 'Cresça.'::text,
    banner_subtitle text DEFAULT 'Acesse cursos premium, aprenda no seu ritmo e transforme seu conhecimento em resultados reais.'::text,
    banner_button_primary_text text DEFAULT 'Explorar Cursos'::text,
    banner_button_secondary_text text DEFAULT 'Meu Progresso'::text,
    banner_background_url text,
    banner_show_stats_card boolean DEFAULT false,
    logo_text text DEFAULT 'EduStream'::text,
    logo_image_url text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    gradient_start_color text DEFAULT '#FF4136'::text,
    gradient_end_color text DEFAULT '#FF851B'::text,
    login_background_url text,
    login_overlay_opacity integer DEFAULT 50 CHECK (login_overlay_opacity >= 0 AND login_overlay_opacity <= 100),
    navigation_layout text DEFAULT 'horizontal'::text CHECK (navigation_layout = ANY (ARRAY['horizontal'::text, 'sidebar'::text, 'both'::text])),
    sidebar_default_collapsed boolean DEFAULT false,
    banner_button_primary_link text DEFAULT '/dashboard'::text,
    banner_button_secondary_link text DEFAULT '/perfil'::text,
    logo_horizontal_url text,
    favicon_url text,
    logo_display_mode text DEFAULT 'icon_text'::text,
    page_title text DEFAULT 'EduStream'::text
);

-- public.user_course_access
CREATE TABLE public.user_course_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    granted_at timestamptz DEFAULT now(),
    granted_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- public.audit_logs
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- public.rate_limits
CREATE TABLE public.rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier text NOT NULL,
    action text NOT NULL,
    count integer DEFAULT 1,
    window_start timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- public.lesson_progress
CREATE TABLE public.lesson_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
    course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    progress_percent integer DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    completed boolean DEFAULT false,
    last_watched_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- public.user_course_categories
CREATE TABLE public.user_course_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    category text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- public.notifications
CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text CHECK (type = ANY (ARRAY['info'::text, 'warning'::text, 'success'::text, 'error'::text])),
    link text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- public.notification_reads
CREATE TABLE public.notification_reads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at timestamptz DEFAULT now()
);

-- public.achievements
CREATE TABLE public.achievements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL,
    criteria_type text NOT NULL,
    criteria_value integer NOT NULL,
    xp_reward integer DEFAULT 0,
    order_index integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- public.user_achievements
CREATE TABLE public.user_achievements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id uuid REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at timestamptz DEFAULT now()
);

-- public.user_stats
CREATE TABLE public.user_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_xp integer DEFAULT 0,
    level integer DEFAULT 1,
    current_streak integer DEFAULT 0,
    best_streak integer DEFAULT 0,
    last_activity_date date,
    lessons_today integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- public.webhook_platforms
CREATE TABLE public.webhook_platforms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    display_name text NOT NULL,
    is_active boolean DEFAULT true,
    webhook_secret text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- public.product_mappings
CREATE TABLE public.product_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id uuid REFERENCES public.webhook_platforms(id) ON DELETE CASCADE,
    external_product_id text NOT NULL,
    external_product_name text,
    course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    category text,
    grant_type text DEFAULT 'course'::text CHECK (grant_type = ANY (ARRAY['course'::text, 'category'::text])),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- public.webhook_transactions
CREATE TABLE public.webhook_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id uuid REFERENCES public.webhook_platforms(id) ON DELETE SET NULL,
    external_transaction_id text NOT NULL,
    external_product_id text,
    customer_email text NOT NULL,
    customer_name text,
    status text NOT NULL,
    event_type text NOT NULL,
    raw_payload jsonb NOT NULL,
    processed_at timestamptz,
    processing_result jsonb,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
    error_message text,
    created_at timestamptz DEFAULT now(),
    retry_count integer DEFAULT 0,
    next_retry_at timestamptz,
    max_retries integer DEFAULT 3
);

-- public.email_settings
CREATE TABLE public.email_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text DEFAULT 'smtp'::text CHECK (provider = ANY (ARRAY['smtp'::text, 'brevo'::text])),
    is_active boolean DEFAULT true,
    smtp_host text,
    smtp_port integer DEFAULT 587,
    smtp_user text,
    smtp_password text,
    smtp_secure boolean DEFAULT true,
    brevo_api_key text,
    from_email text NOT NULL,
    from_name text NOT NULL,
    welcome_subject text DEFAULT 'Bem-vindo à plataforma! 🎉'::text,
    welcome_template text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    template_colors jsonb DEFAULT '{"text": "#18181b", "muted": "#71717a", "primary": "#FF4136", "secondary": "#FF851B", "background": "#f4f4f5", "cardBackground": "#ffffff"}'::jsonb
);

-- public.email_logs
CREATE TABLE public.email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email text NOT NULL,
    recipient_name text,
    subject text NOT NULL,
    email_type text NOT NULL,
    provider text NOT NULL,
    status text NOT NULL CHECK (status = ANY (ARRAY['sent'::text, 'failed'::text, 'queued'::text])),
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- public.webhook_samples
CREATE TABLE public.webhook_samples (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id uuid REFERENCES public.webhook_platforms(id) ON DELETE CASCADE,
    raw_payload jsonb NOT NULL,
    learned_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- public.platform_field_mappings
CREATE TABLE public.platform_field_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id uuid REFERENCES public.webhook_platforms(id) ON DELETE CASCADE,
    field_type text NOT NULL,
    json_path text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- public.platform_status_mappings
CREATE TABLE public.platform_status_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id uuid REFERENCES public.webhook_platforms(id) ON DELETE CASCADE,
    external_value text NOT NULL,
    internal_status text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- public.webhook_schemas
CREATE TABLE public.webhook_schemas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id uuid REFERENCES public.webhook_platforms(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    fields_json jsonb DEFAULT '[]'::jsonb,
    sample_payload jsonb,
    sample_event_id uuid REFERENCES public.webhook_transactions(id),
    is_learned boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- public.webhook_field_mappings
CREATE TABLE public.webhook_field_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id uuid REFERENCES public.webhook_platforms(id) ON DELETE CASCADE,
    event_type text,
    source_path text NOT NULL,
    internal_field text NOT NULL,
    is_primary boolean DEFAULT false,
    transform_type text DEFAULT 'direct'::text,
    transform_config jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- public.lesson_materials
CREATE TABLE public.lesson_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type = ANY (ARRAY['link'::text, 'text'::text, 'download'::text, 'embed'::text])),
    title text NOT NULL,
    content text NOT NULL,
    description text,
    order_index integer DEFAULT 0,
    is_required boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- public.whatsapp_settings
CREATE TABLE public.whatsapp_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active boolean DEFAULT true,
    provider text NOT NULL DEFAULT 'evolution'::text,
    evolution_api_url text,
    evolution_api_key text,
    evolution_instance_name text,
    zapi_instance_id text,
    zapi_token text,
    zapi_security_token text,
    waha_api_url text,
    waha_session_name text,
    meta_phone_number_id text,
    meta_access_token text,
    meta_business_account_id text,
    default_country_code text DEFAULT '55'::text,
    send_typing_indicator boolean DEFAULT true,
    delay_between_messages integer DEFAULT 1000,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- public.message_templates
CREATE TABLE public.message_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    title text NOT NULL,
    description text,
    message text NOT NULL,
    active boolean DEFAULT true,
    category text DEFAULT 'general'::text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- public.whatsapp_logs
CREATE TABLE public.whatsapp_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone text NOT NULL,
    template_key text,
    message_preview text,
    provider text NOT NULL,
    status text NOT NULL,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- public.course_categories
CREATE TABLE public.course_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- public.gateways
CREATE TABLE public.gateways (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    is_active boolean DEFAULT false,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- public.gateway_credentials
CREATE TABLE public.gateway_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id uuid REFERENCES public.gateways(id) ON DELETE CASCADE,
    env text NOT NULL CHECK (env = ANY (ARRAY['test'::text, 'live'::text])),
    public_key text,
    secret_key text,
    webhook_secret text,
    extra_config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    allowed_methods text[] DEFAULT ARRAY['credit_card'::text, 'pix'::text, 'bolbradesco'::text],
    max_installments integer DEFAULT 1
);

-- public.products
CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    image_url text,
    active boolean DEFAULT true,
    type text NOT NULL CHECK (type = ANY (ARRAY['one_time'::text, 'subscription'::text])),
    checkout_config jsonb DEFAULT '{"features": [], "logo_url": null, "banner_url": null, "primary_color": "#7C3AED"}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    price integer DEFAULT 0,
    course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
    category text
);

-- public.prices
CREATE TABLE public.prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    nickname text,
    currency text DEFAULT 'BRL'::text,
    unit_amount integer NOT NULL,
    type text NOT NULL CHECK (type = ANY (ARRAY['one_time'::text, 'recurring'::text])),
    interval text CHECK ("interval" = ANY (ARRAY['day'::text, 'week'::text, 'month'::text, 'year'::text])),
    interval_count integer DEFAULT 1,
    trial_period_days integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- public.orders
CREATE TABLE public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['draft'::text, 'pending'::text, 'paid'::text, 'failed'::text, 'canceled'::text, 'expired'::text])),
    currency text DEFAULT 'BRL'::text,
    total_amount integer NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    customer_email text,
    customer_name text,
    customer_phone text,
    customer_cpf text
);

-- public.order_items
CREATE TABLE public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    price_id uuid REFERENCES public.prices(id) ON DELETE SET NULL,
    quantity integer DEFAULT 1,
    unit_amount integer NOT NULL,
    total_amount integer NOT NULL,
    kind text DEFAULT 'main'::text CHECK (kind = ANY (ARRAY['main'::text, 'order_bump'::text])),
    created_at timestamptz DEFAULT now()
);

-- public.payments
CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    gateway_id uuid REFERENCES public.gateways(id) ON DELETE SET NULL,
    external_payment_id text,
    status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text, 'processing'::text])),
    amount integer NOT NULL,
    currency text DEFAULT 'BRL'::text,
    payment_method_type text,
    raw_response jsonb,
    paid_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- public.subscriptions
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    price_id uuid REFERENCES public.prices(id) ON DELETE SET NULL,
    gateway_id uuid REFERENCES public.gateways(id) ON DELETE SET NULL,
    external_subscription_id text,
    status text DEFAULT 'incomplete'::text CHECK (status = ANY (ARRAY['trialling'::text, 'active'::text, 'canceled'::text, 'incomplete'::text, 'incomplete_expired'::text, 'past_due'::text, 'unpaid'::text, 'paused'::text])),
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at_period_end boolean DEFAULT false,
    canceled_at timestamptz,
    ended_at timestamptz,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- public.entitlements
CREATE TABLE public.entitlements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    source_type text NOT NULL CHECK (source_type = ANY (ARRAY['order'::text, 'subscription'::text, 'manual'::text])),
    source_id uuid NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text])),
    starts_at timestamptz DEFAULT now(),
    ends_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- public.webhook_events
CREATE TABLE public.webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id uuid REFERENCES public.gateways(id) ON DELETE SET NULL,
    event_type text NOT NULL,
    external_event_id text,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'processed'::text, 'failed'::text])),
    processing_error text,
    processed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- public.customers
CREATE TABLE public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    name text,
    phone text,
    cpf text,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    source text DEFAULT 'checkout'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.customers IS 'Clientes que compraram produtos (diferente de alunos)';

-- public.order_bumps
CREATE TABLE public.order_bumps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active boolean DEFAULT true,
    title text,
    description text,
    offer_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    trigger_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    discount_percent integer DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    priority integer DEFAULT 10,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    color text DEFAULT 'orange'::text
);

-- public.webhook_event_receivers
CREATE TABLE public.webhook_event_receivers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id uuid REFERENCES public.webhook_platforms(id) ON DELETE CASCADE,
    event_type text NOT NULL CHECK (event_type = ANY (ARRAY['purchase_approved'::text, 'purchase_refunded'::text, 'subscription_active'::text, 'subscription_cancelled'::text, 'subscription_expired'::text, 'chargeback'::text])),
    webhook_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text),
    is_active boolean DEFAULT true,
    field_mappings jsonb DEFAULT '[]'::jsonb,
    sample_payload jsonb,
    use_global_mappings boolean DEFAULT true,
    fixed_course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    name text
);
