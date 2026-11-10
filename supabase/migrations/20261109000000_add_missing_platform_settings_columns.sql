-- Colunas usadas pelo código mas ausentes no schema remoto de platform_settings.
-- Sem elas, o PostgREST rejeita o UPDATE/INSERT inteiro (PGRST204 / 42703).

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS certificate_signature_url text,
  ADD COLUMN IF NOT EXISTS certificate_instructor_name text,
  ADD COLUMN IF NOT EXISTS monitoring_sentry_dsn text,
  ADD COLUMN IF NOT EXISTS monitoring_sentry_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS monitoring_internal_logs_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_secret text;
