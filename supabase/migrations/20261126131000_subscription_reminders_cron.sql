-- Cron diário dos avisos de assinatura: 13:00 UTC = 10:00 em Brasília,
-- fora da janela do drip (12:00 UTC) e da retenção (21:00 UTC).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'subscription_reminders_url') then
    perform vault.create_secret(
      'https://pbrdmjcpipuatbnkvekz.supabase.co/functions/v1/subscription-reminders',
      'subscription_reminders_url',
      'Cron diário dos avisos de assinatura');
  end if;
end $$;

create or replace function public.trigger_subscription_reminders()
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
   where name = 'subscription_reminders_url' limit 1;
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
  if exists (select 1 from cron.job where jobname = 'subscription-reminders') then
    perform cron.unschedule('subscription-reminders');
  end if;
end $$;

select cron.schedule('subscription-reminders', '0 13 * * *',
  'select public.trigger_subscription_reminders();');
