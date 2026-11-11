-- View pública com os dados de branding/configuração que a tela de login
-- precisa ler ANTES do usuário autenticar (role anon).
--
-- Motivo: a tabela platform_settings tem RLS apenas para "authenticated",
-- então a tela de login caía sempre nos valores padrão (sem logo/fundo).
--
-- Segurança: a view expõe somente colunas não sensíveis. webhook_secret NÃO
-- é incluído. A view roda como o owner (security_invoker = false), ignorando
-- a RLS da tabela subjacente, e é somente leitura.

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
  updated_at
FROM public.platform_settings
WHERE is_active = true;

COMMENT ON VIEW public.platform_settings_public IS
  'Dados públicos de branding/configuração (sem segredos), legíveis por anon para a tela de login.';

GRANT SELECT ON public.platform_settings_public TO anon, authenticated;
