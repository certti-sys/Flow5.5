-- Cron diário: dispara o e-mail de conteúdo liberado às 12:00 UTC = 09:00
-- em Brasília. Mesmo padrão de trigger_cart_recovery / trigger_retention_cron:
-- URL no vault, service_role_key no vault, net.http_post com Bearer, erro
-- engolido (a rodada de amanhã cobre).

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'drip_release_email_dispatch_url') then
    perform vault.create_secret(
      'https://pbrdmjcpipuatbnkvekz.supabase.co/functions/v1/drip-release-email',
      'drip_release_email_dispatch_url',
      'Cron diário do e-mail de conteúdo liberado');
  end if;
end $$;

create or replace function public.trigger_drip_release_email()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets
   where name = 'drip_release_email_dispatch_url' limit 1;
  select decrypted_secret into v_key from vault.decrypted_secrets
   where name = 'service_role_key' limit 1;
  if v_url is null or v_key is null then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key,
      'X-Requested-With', 'XMLHttpRequest'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
exception when others then
  null;
end;
$function$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'drip-release-email') then
    perform cron.unschedule('drip-release-email');
  end if;
end $$;

select cron.schedule('drip-release-email', '0 12 * * *',
  'select public.trigger_drip_release_email();');
