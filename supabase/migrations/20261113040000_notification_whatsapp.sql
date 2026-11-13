-- Canal WhatsApp para a notificação interna.
--
-- Admin marca `send_whatsapp` ao criar o aviso; um trigger resolve a audiência
-- e enfileira uma entrega por destinatário com telefone em `profiles.whatsapp`.
-- A fila é durável pelo mesmo motivo dos webhooks: `send-whatsapp` tem rate
-- limit de 5/hora por número, então o envio precisa poder falhar e voltar.
--
-- A publicação entra no envio, não no insert: aviso agendado para semana que
-- vem não pode sair no WhatsApp hoje. A checagem fica na query de drenagem,
-- comparando `publish_at`/`expires_at` com `now()`.

alter table public.notifications
    add column if not exists send_whatsapp boolean not null default false;

create table if not exists public.notification_deliveries (
    id uuid primary key default gen_random_uuid(),
    notification_id uuid not null references public.notifications(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    phone text not null,
    status text not null default 'pending'
        check (status in ('pending', 'sent', 'failed', 'skipped')),
    attempts integer not null default 0,
    last_error text,
    next_attempt_at timestamptz not null default now(),
    sent_at timestamptz,
    created_at timestamptz not null default now()
);

-- Sem unique, retry do trigger duplicaria mensagem para o mesmo aluno.
create unique index if not exists idx_notification_deliveries_unique
    on public.notification_deliveries (notification_id, user_id);

create index if not exists idx_notification_deliveries_queue
    on public.notification_deliveries (next_attempt_at)
    where status = 'pending';

alter table public.notification_deliveries enable row level security;

drop policy if exists "Admins read deliveries" on public.notification_deliveries;
create policy "Admins read deliveries" on public.notification_deliveries
    for select to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Ninguém escreve pelo cliente: quem enfileira é o trigger, quem drena é o
-- service role.

-- ============================================================================
-- ENFILEIRAMENTO
-- ============================================================================

create or replace function public.enqueue_notification_deliveries()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
    if not new.send_whatsapp then
        return new;
    end if;

    insert into public.notification_deliveries (notification_id, user_id, phone)
    select new.id, p.id, p.whatsapp
      from public.profiles p
     where btrim(coalesce(p.whatsapp, '')) <> ''
       and case new.audience
               when 'all' then true
               when 'user' then p.id = new.audience_id
               when 'course' then exists (
                   select 1 from public.user_course_access a
                    where a.user_id = p.id and a.course_id = new.audience_id
               )
               when 'product' then exists (
                   select 1
                     from public.order_items oi
                     join public.orders o on o.id = oi.order_id
                    where oi.product_id = new.audience_id
                      and o.user_id = p.id
                      and o.status = 'paid'
               )
               else false
           end
    on conflict (notification_id, user_id) do nothing;

    return new;
exception when others then
    -- WhatsApp é canal extra: nunca impede o aviso interno de existir.
    raise warning 'enqueue_notification_deliveries falhou no aviso %: %', new.id, sqlerrm;
    return new;
end;
$function$;

drop trigger if exists enqueue_notification_deliveries_on_insert on public.notifications;
create trigger enqueue_notification_deliveries_on_insert
    after insert on public.notifications
    for each row execute function public.enqueue_notification_deliveries();

-- ============================================================================
-- CRON
-- ============================================================================

-- Mesmo desenho do dispatch-webhooks: só age se o secret existir.
--
--   select vault.create_secret(
--     'https://<ref>.supabase.co/functions/v1/dispatch-notifications',
--     'notification_dispatch_url');
create or replace function public.trigger_notification_dispatch()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
    v_url text;
    v_key text;
begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notification_dispatch_url' limit 1;
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key' limit 1;
    if v_url is null or v_key is null then
        return;
    end if;

    perform net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 10000
    );
exception when others then
    -- Rede fora: a próxima rodada pega a fila.
    null;
end;
$function$;

do $$
begin
    if exists (select 1 from cron.job where jobname = 'dispatch-notifications') then
        perform cron.unschedule('dispatch-notifications');
    end if;
end;
$$;

select cron.schedule(
    'dispatch-notifications',
    '* * * * *',
    'select public.trigger_notification_dispatch();'
);
