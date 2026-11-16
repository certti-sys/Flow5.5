-- Interruptor de certificados, global e por curso.
--
-- Nem todo curso entrega certificado. O padrão é desligado: o admin liga
-- explicitamente, por curso ou na plataforma inteira. Certificados já emitidos
-- continuam acessíveis — o bloqueio é só na emissão.
--
-- A checagem vive no banco porque a RLS de `certificates` permite o aluno
-- inserir o próprio certificado (`Users can create own certificates`). Desligar
-- apenas na UI não impediria a chamada direta à API.

alter table public.platform_settings
  add column if not exists certificates_enabled boolean not null default false;

alter table public.courses
  add column if not exists certificates_enabled boolean not null default false;

comment on column public.platform_settings.certificates_enabled is
  'Entrega de certificados na plataforma. off = nenhum curso entrega.';
comment on column public.courses.certificates_enabled is
  'Entrega de certificado neste curso. Só vale com certificates_enabled global on.';

/**
 * Bloqueia emissão de certificado quando o curso ou a plataforma está desligado.
 *
 * Admin (emissão manual pelo painel) e service role (edge function) passam
 * direto. Erro de leitura vira warning em vez de exception: um certificado já
 * emitido nunca pode derrubar o insert.
 */
create or replace function public.enforce_certificate_enabled()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_global boolean;
  v_course boolean;
begin
  -- auth.uid() nulo = contexto service role/server; a RLS já barra o anônimo.
  if auth.uid() is null then
    return new;
  end if;

  if exists (
    select 1 from public.user_roles
     where user_id = auth.uid() and role = 'admin'::app_role
  ) then
    return new;
  end if;

  begin
    select certificates_enabled into v_global
      from public.platform_settings
     where is_active
     order by created_at
     limit 1;

    select certificates_enabled into v_course
      from public.courses
     where id = new.course_id;
  exception when others then
    raise warning 'enforce_certificate_enabled não conseguiu ler as flags do curso %: %', new.course_id, sqlerrm;
    return new;
  end;

  if coalesce(v_global, false) is false or coalesce(v_course, false) is false then
    raise exception 'Certificado desativado para este curso.'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_enforce_certificate_enabled on public.certificates;
create trigger trg_enforce_certificate_enabled
  before insert on public.certificates
  for each row execute function public.enforce_certificate_enabled();

-- A view pública precisa expor a nova coluna para o front (usuário anônimo lê dela).
-- `security_invoker = false` explícito: sem ele a view passaria a respeitar a RLS
-- da tabela e o login anônimo perderia logo/fundo de novo.
create or replace view public.platform_settings_public
with (security_invoker = false) as
  select id,
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
    banner_title_size,
    certificates_enabled
  from public.platform_settings
 where is_active = true;

-- create or replace preserva os grants, mas reafirmar evita quebrar o login
-- anonimo caso a view seja recriada do zero em outro ambiente.
grant select on public.platform_settings_public to anon, authenticated;
