-- Sistema de webhooks: saída (eventos para integradores) e entrada (receptores).
--
-- Espelha o modelo do sistema de referência (envelope com slug de evento,
-- retry com backoff, log por tentativa, reenvio manual), mas com três
-- escolhas diferentes:
--
--   1. Assinatura HMAC (`X-Flow-Signature: t=<ts>,v1=<hex>`) em vez de bearer
--      token: autentica o corpo e barra replay, e não vaza em log de proxy.
--   2. Slug em inglês e estável (`order.paid`), não em pt-BR.
--   3. Nada é fail-open: entrega que não confirma fica `pending` e é
--      retentada; o destinatário nunca recebe um evento que o PSP não
--      confirmou.
--
-- A fila é durável: o trigger grava em `webhook_deliveries`, e o
-- `dispatch-webhooks` (agendado no pg_cron a cada minuto) drena.

-- ============================================================================
-- 1. FECHAR O FURO DE RLS
-- ============================================================================
-- Todas as tabelas de webhook tinham policy "Authenticated all access" com
-- qual = true. Qualquer aluno autenticado lia `webhook_platforms.webhook_secret`
-- e podia mapear um produto externo para o curso que quisesse, chamando
-- `webhooks-ingest` em seguida para se autoconceder acesso.

do $$
declare
    t text;
begin
    foreach t in array array[
        'webhook_platforms',
        'webhook_event_receivers',
        'webhook_field_mappings',
        'webhook_schemas',
        'webhook_samples',
        'platform_field_mappings',
        'platform_status_mappings',
        'product_mappings'
    ] loop
        if exists (
            select 1 from pg_policies
            where schemaname = 'public' and tablename = t
              and policyname = 'Authenticated all access'
        ) then
            execute format('drop policy %I on public.%I', 'Authenticated all access', t);
        end if;

        execute format(
            'create policy %I on public.%I for all to authenticated using (public.has_role(auth.uid(), %L::public.app_role)) with check (public.has_role(auth.uid(), %L::public.app_role))',
            'Admins only', t, 'admin', 'admin'
        );
    end loop;
end $$;

drop policy if exists "Admins can update webhook_transactions" on public.webhook_transactions;
drop policy if exists "Admins only" on public.webhook_transactions;
create policy "Admins only" on public.webhook_transactions
    for all to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role))
    with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================================
-- 2. SAÍDA: ENDPOINTS E ENTREGAS
-- ============================================================================

create table if not exists public.webhook_endpoints (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    url text not null check (url ~* '^https?://'),
    secret text not null,
    events text[] not null default '{}',
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.webhook_deliveries (
    id uuid primary key default gen_random_uuid(),
    endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
    event text not null,
    payload jsonb not null,
    -- 'pending' | 'delivered' | 'failed'
    status text not null default 'pending',
    attempt integer not null default 0,
    max_attempts integer not null default 5,
    next_attempt_at timestamptz not null default now(),
    response_status integer,
    response_body text,
    error text,
    delivered_at timestamptz,
    created_at timestamptz not null default now()
);

-- O worker busca sempre o mesmo recorte: pendentes vencidos, mais antigos primeiro.
create index if not exists idx_webhook_deliveries_due
    on public.webhook_deliveries (next_attempt_at)
    where status = 'pending';

create index if not exists idx_webhook_deliveries_endpoint
    on public.webhook_deliveries (endpoint_id, created_at desc);

alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;

create policy "Admins only" on public.webhook_endpoints
    for all to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role))
    with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Log de entrega é somente leitura para o admin; escrita é do service role,
-- que ignora RLS. Assim o painel não consegue forjar um "delivered".
create policy "Admins read deliveries" on public.webhook_deliveries
    for select to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role));

create or replace function public.touch_webhook_endpoint()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists touch_webhook_endpoint on public.webhook_endpoints;
create trigger touch_webhook_endpoint
    before update on public.webhook_endpoints
    for each row execute function public.touch_webhook_endpoint();

-- ============================================================================
-- 3. ENFILEIRAMENTO POR TRANSIÇÃO DE PEDIDO
-- ============================================================================
-- Um trigger em `orders` cobre os 8 webhooks de gateway, o polling do
-- `check_payment_status`, a aprovação manual no admin e qualquer caminho
-- futuro. Antes disso cada webhook teria que chamar o emissor por conta
-- própria, e um nono caminho esquecido nunca emitiria nada.

create or replace function public.enqueue_webhook_deliveries()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_event text;
    v_payload jsonb;
begin
    if tg_op = 'UPDATE' and new.status is not distinct from old.status then
        return new;
    end if;

    -- `orders.status` não tem 'refunded' (check: draft|pending|paid|failed|
    -- canceled|expired). Reembolso é detectado no trigger de `payments`, logo
    -- abaixo. Um pedido que nasce 'paid' (aprovação manual) também emite.
    v_event := case new.status
        when 'paid' then 'order.paid'
        when 'failed' then 'order.failed'
        when 'canceled' then 'order.canceled'
        when 'expired' then 'order.expired'
        else null
    end;

    if v_event is null then
        return new;
    end if;

    v_payload := public.build_order_webhook_payload(new.id, new.status);
    if v_payload is null then
        return new;
    end if;

    insert into public.webhook_deliveries (endpoint_id, event, payload)
    select e.id, v_event, v_payload
    from public.webhook_endpoints e
    where e.is_active and v_event = any (e.events);

    return new;
exception when others then
    -- Integração nunca pode desfazer a confirmação do pagamento
    -- (mesma regra do trigger `grant_order_access`).
    raise warning 'enqueue_webhook_deliveries falhou no pedido %: %', new.id, sqlerrm;
    return new;
end;
$function$;

drop trigger if exists enqueue_webhook_deliveries on public.orders;
create trigger enqueue_webhook_deliveries
    after insert or update of status on public.orders
    for each row execute function public.enqueue_webhook_deliveries();

-- Reembolso vem de `payments`: os 8 gateways só atualizam `orders.status`
-- para 'failed' nesse caso, o que é indistinguível de um cartão recusado.
create or replace function public.enqueue_refund_deliveries()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_payload jsonb;
begin
    if new.status <> 'refunded' or coalesce(old.status, '') = 'refunded' then
        return new;
    end if;

    v_payload := public.build_order_webhook_payload(new.order_id, 'refunded');
    if v_payload is null then
        return new;
    end if;

    insert into public.webhook_deliveries (endpoint_id, event, payload)
    select e.id, 'order.refunded', v_payload
    from public.webhook_endpoints e
    where e.is_active and 'order.refunded' = any (e.events);

    return new;
exception when others then
    raise warning 'enqueue_refund_deliveries falhou no pagamento %: %', new.id, sqlerrm;
    return new;
end;
$function$;

drop trigger if exists enqueue_refund_deliveries on public.payments;
create trigger enqueue_refund_deliveries
    after update of status on public.payments
    for each row execute function public.enqueue_refund_deliveries();

-- Payload público do pedido. Fica fora do trigger para não duplicar a
-- montagem entre o evento de status e o de reembolso.
create or replace function public.build_order_webhook_payload(p_order_id uuid, p_status text)
returns jsonb
language sql
security definer
set search_path = public
as $function$
    select jsonb_build_object(
        'order_id', o.id,
        'status', coalesce(p_status, o.status),
        'currency', o.currency,
        'amount', o.total_amount,
        'paid_at', o.paid_at,
        'external_id', o.external_id,
        'created_at', o.created_at,
        'customer', jsonb_build_object(
            'name', o.customer_name,
            'email', o.customer_email,
            'phone', o.customer_phone
        ),
        'items', coalesce((
            select jsonb_agg(jsonb_build_object(
                'product_id', oi.product_id,
                'product_name', p.name,
                'course_id', p.course_id,
                'amount', oi.total_amount
            ))
            from public.order_items oi
            join public.products p on p.id = oi.product_id
            where oi.order_id = o.id
        ), '[]'::jsonb)
    )
    from public.orders o
    where o.id = p_order_id;
$function$;

-- ============================================================================
-- 4. ENTRADA: ENDURECER O RECEPTOR
-- ============================================================================
-- `webhook_event_receivers` ganha assinatura opcional e rastro de uso. Sem
-- isso o receptor aceitava qualquer POST com o token na URL, sem checar
-- `is_active` nem idempotência.

alter table public.webhook_event_receivers
    add column if not exists signing_secret text,
    add column if not exists last_received_at timestamptz,
    add column if not exists request_count bigint not null default 0;

-- Idempotência da entrada: a mesma transação externa não pode liberar acesso
-- duas vezes.
create unique index if not exists idx_webhook_transactions_platform_tx
    on public.webhook_transactions (platform_id, external_transaction_id)
    where external_transaction_id is not null;

-- Rate limit por receptor, além do global. Um token vazado não pode inundar
-- a tabela de transações.
create table if not exists public.webhook_receiver_events (
    id uuid primary key default gen_random_uuid(),
    receiver_id uuid not null references public.webhook_event_receivers(id) on delete cascade,
    external_transaction_id text,
    outcome text not null,
    actor_email text,
    reason text,
    created_at timestamptz not null default now()
);

create index if not exists idx_webhook_receiver_events_receiver
    on public.webhook_receiver_events (receiver_id, created_at desc);

create or replace function public.bump_webhook_receiver_count(p_receiver_id uuid)
returns void
language sql
security definer
set search_path = public
as $function$
    update public.webhook_event_receivers
       set request_count = request_count + 1,
           last_received_at = now()
     where id = p_receiver_id;
$function$;

alter table public.webhook_receiver_events enable row level security;

create policy "Admins only" on public.webhook_receiver_events
    for all to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role))
    with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Cron: drena a fila a cada minuto. `pg_cron`/`pg_net` não estavam
-- instalados; sem eles, um destino fora do ar no momento da venda só seria
-- retentado quando outra venda acontecesse.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- Dispara a function de drenagem. Só age se os dois secrets existirem no
-- vault, criados uma vez pelo operador:
--
--   select vault.create_secret(
--     'https://<ref>.supabase.co/functions/v1/dispatch-webhooks',
--     'webhook_dispatch_url');
--   select vault.create_secret('<service_role_key>', 'service_role_key');
--
-- Sem eles a function nunca é chamada pelo cron, e a drenagem fica só no
-- caminho inline (todo pedido pago dispara uma rodada).
create or replace function public.trigger_webhook_dispatch()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
    v_url text;
    v_key text;
begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'webhook_dispatch_url' limit 1;
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
    -- Rede/consulta fora: a próxima rodada cobre.
    null;
end;
$function$;

do $$
begin
    if exists (select 1 from cron.job where jobname = 'dispatch-webhooks') then
        perform cron.unschedule('dispatch-webhooks');
    end if;
end $$;

select cron.schedule(
    'dispatch-webhooks',
    '* * * * *',
    $cron$select public.trigger_webhook_dispatch();$cron$
);
