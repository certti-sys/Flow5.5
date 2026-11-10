-- Flow 5.1 - Database Schema
-- Last Export: 2026-04-06

-- Custom types
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS public.courses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    thumbnail text,
    category text,
    instructor text,
    duration text,
    description text,
    show_card_overlay boolean DEFAULT true,
    show_category_badge boolean DEFAULT true,
    checkout_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.modules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    title text NOT NULL,
    order_index integer NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
    title text NOT NULL,
    duration text,
    video_url text,
    order_index integer NOT NULL,
    description text,
    is_public boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    name text,
    email text,
    whatsapp text,
    avatar_url text,
    status text DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    suspended_at timestamptz,
    suspended_by uuid REFERENCES auth.users(id),
    suspension_reason text,
    member_since timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role DEFAULT 'user',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    logo_text text DEFAULT 'EduStream',
    logo_image_url text,
    logo_display_mode text DEFAULT 'icon_text',
    page_title text DEFAULT 'EduStream',
    favicon_url text,
    banner_badge_text text,
    banner_title_line1 text,
    banner_title_line2 text,
    banner_title_line3 text,
    banner_subtitle text,
    banner_button_primary_text text,
    banner_button_secondary_text text,
    banner_button_primary_link text,
    banner_button_secondary_link text,
    banner_background_url text,
    login_background_url text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theme_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    primary_color text,
    color_palette jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Payment Tables
CREATE TABLE IF NOT EXISTS public.gateways (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE,
    slug text UNIQUE,
    is_active boolean DEFAULT false,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    price integer DEFAULT 0,
    type text CHECK (type IN ('one_time', 'subscription')),
    course_id uuid REFERENCES public.courses(id),
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    customer_email text,
    customer_name text,
    customer_cpf text,
    total_amount integer,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Gamification
CREATE TABLE IF NOT EXISTS public.achievements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text,
    description text,
    icon text,
    criteria_type text,
    criteria_value integer,
    xp_reward integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid UNIQUE REFERENCES auth.users(id),
    total_xp integer DEFAULT 0,
    level integer DEFAULT 1,
    current_streak integer DEFAULT 0,
    best_streak integer DEFAULT 0,
    last_activity_date date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS Enablement
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
