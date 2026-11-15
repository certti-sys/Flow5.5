-- Web Push como canal da notificação interna, reaproveitando a fila.
--
-- `notification_deliveries` hoje é 1 linha por (aviso, usuário) com `phone`.
-- Passa a ser 1 linha por (aviso, usuário, canal): o mesmo aviso pode sair no
-- WhatsApp e no push, e cada canal falha de forma independente (o WhatsApp tem
-- rate limit por número; o push tem inscrição que expira e devolve 410).
--
-- A chave da fila vira (notification_id, user_id, channel), então o unique
-- antigo (notification_id, user_id) precisa sair.

alter table public.notification_deliveries
    add column if not exists channel text not null default 'whatsapp'
        check (channel in ('whatsapp', 'push'));

-- `phone` era obrigatório e só faz sentido no WhatsApp; o push endereça por
-- `push_subscriptions` (uma pessoa pode ter celular e desktop).
alter table public.notification_deliveries
    alter column phone drop not null;

drop index if exists public.idx_notification_deliveries_unique;
create unique index if not exists idx_notification_deliveries_unique
    on public.notification_deliveries (notification_id, user_id, channel);

create index if not exists idx_notification_deliveries_pending
    on public.notification_deliveries (channel, next_attempt_at)
    where status = 'pending';

-- ============================================================================
-- INSCRIÇÕES PUSH
-- ============================================================================

-- Uma linha por navegador/perfil instalado. `endpoint` é único no mundo: a
-- mesma inscrição pode reaparecer se o usuário logar em outra conta no mesmo
-- aparelho — nesse caso ela é transferida (upsert por endpoint), senão o dono
-- antigo levaria push de aviso que não é dele.
create table if not exists public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    user_agent text,
    created_at timestamptz not null default now(),
    last_used_at timestamptz,
    failure_count integer not null default 0
);

create index if not exists idx_push_subscriptions_user
    on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Cada um cuida das suas inscrições. Sem policy de escrita para admin: não há
-- motivo para o painel inscrever um aparelho que não é dele.
drop policy if exists "Own push subscriptions" on public.push_subscriptions;
create policy "Own push subscriptions" on public.push_subscriptions
    for all to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- ============================================================================
-- FLAGS DO AVISO
-- ============================================================================

alter table public.notifications
    add column if not exists send_push boolean not null default false;

-- ============================================================================
-- ENFILEIRAMENTO
-- ============================================================================

-- Resolve a audiência uma vez e grava uma linha por canal ligado.
create or replace function public.enqueue_notification_deliveries()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
    if not new.send_whatsapp and not new.send_push then
        return new;
    end if;

    if new.send_whatsapp then
        insert into public.notification_deliveries (notification_id, user_id, channel, phone)
        select new.id, p.id, 'whatsapp', p.whatsapp
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
        on conflict (notification_id, user_id, channel) do nothing;
    end if;

    if new.send_push then
        insert into public.notification_deliveries (notification_id, user_id, channel)
        select distinct new.id, s.user_id, 'push'
          from public.push_subscriptions s
         where case new.audience
                   when 'all' then true
                   when 'user' then s.user_id = new.audience_id
                   when 'course' then exists (
                       select 1 from public.user_course_access a
                        where a.user_id = s.user_id and a.course_id = new.audience_id
                   )
                   when 'product' then exists (
                       select 1
                         from public.order_items oi
                         join public.orders o on o.id = oi.order_id
                        where oi.product_id = new.audience_id
                          and o.user_id = s.user_id
                          and o.status = 'paid'
                   )
                   else false
               end
        on conflict (notification_id, user_id, channel) do nothing;
    end if;

    return new;
exception when others then
    -- Canal extra nunca impede o aviso interno de existir.
    raise warning 'enqueue_notification_deliveries falhou no aviso %: %', new.id, sqlerrm;
    return new;
end;
$function$;

-- ============================================================================
-- RATE LIMIT
-- ============================================================================

-- `rate_limits` tinha RLS ligado com a policy "Authenticated all access"
-- (qual = true), ou seja, qualquer aluno lia e zerava o próprio contador. Isso
-- já era um furo (rate limit de `send-whatsapp` é por telefone, não por
-- usuário) e ficaria pior agora que o push usa a mesma tabela. Quem escreve é
-- só o service role, que ignora RLS.
alter table public.rate_limits enable row level security;

do $$
declare
    p record;
begin
    for p in
        select policyname from pg_policies
         where schemaname = 'public' and tablename = 'rate_limits'
    loop
        execute format('drop policy %I on public.rate_limits', p.policyname);
    end loop;
end
$$;
