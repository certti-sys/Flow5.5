-- Tamanho do título do banner configurável em /admin/personalizacao.
-- Antes o título era fixo em text-4xl/5xl/6xl e, em telas menores, estourava a
-- altura do hero (h-[42vh] + overflow-hidden), cortando o topo do texto.

alter table public.platform_settings
  add column if not exists banner_title_size text not null default 'md';

alter table public.platform_settings
  drop constraint if exists platform_settings_banner_title_size_check;

alter table public.platform_settings
  add constraint platform_settings_banner_title_size_check
  check (banner_title_size in ('sm', 'md', 'lg'));

CREATE OR REPLACE VIEW public.platform_settings_public
WITH (security_invoker = false) AS
SELECT
  id,
  banner_badge_text,
  banner_title_line1,
  banner_title_line2,
  banner_title_line3,
  banner_subtitle,
  banner_button_primary_text,
  banner_button_primary_link,
  banner_button_secondary_text,
  banner_button_secondary_link,
  banner_background_url,
  banner_show_stats_card,
  logo_text,
  logo_image_url,
  logo_horizontal_url,
  favicon_url,
  logo_display_mode,
  page_title,
  gradient_start_color,
  gradient_end_color,
  certificate_signature_url,
  certificate_instructor_name,
  certificate_logo_url,
  certificate_template,
  login_background_url,
  login_overlay_opacity,
  navigation_layout,
  sidebar_default_collapsed,
  is_active,
  monitoring_sentry_dsn,
  monitoring_sentry_active,
  monitoring_internal_logs_active,
  created_at,
  updated_at,
  banner_title_size
FROM public.platform_settings
WHERE is_active = true;

GRANT SELECT ON public.platform_settings_public TO anon, authenticated;
