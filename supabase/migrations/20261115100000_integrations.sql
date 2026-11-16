-- Integrações de marketing: UTMfy, Spedy e pixels.
--
-- O sistema de referência tem uma tabela por integração
-- (`utmify_integrations`, `spedy_integrations`, `pixel_x_integrations`,
-- `conversion_pixel_integrations`) com o mesmo formato: credencial, flag de
-- ativo e pivot de produtos. Aqui é uma tabela só com `kind`, porque RLS,
-- filtro por produto e fila são idênticos — quatro tabelas significariam
-- quatro vezes o mesmo código de dispatcher.
--
-- A fila segue o desenho já validado em `webhook_deliveries`: o trigger grava,
-- a edge function drena, o pg_cron retenta. Integração lenta nunca roda dentro
-- do webhook do gateway, senão um UTMfy fora do ar atrasaria a confirmação do
-- pagamento.

-- ============================================================================
-- 1. CREDENCIAIS
-- ============================================================================

create table if not exists public.integrations (
    id uuid primary key default gen_random_uuid(),
    kind text not null check (kind in (
        'utmify', 'spedy',
        'pixel_meta', 'pixel_tiktok', 'pixel_google_ads', 'pixel_ga4', 'pixel_script'
    )),
    name text not null,
    -- Parâmetros não sensíveis: pixel_id, conversion_id, environment, flags.
    config jsonb not null default '{}'::jsonb,
    -- Token/chave. Nunca é devolvido ao cliente: o select de coluna abaixo
    -- expõe apenas `has_secret`.
    secret text,
    has_secret boolean generated always as (secret is not null) stored,
    is_active boolean not null default true,
    -- Vazio = todos os produtos (mesma semântica do sistema de referência).
    product_ids uuid[] not null default '{}'::uuid[],
    last_tested_at timestamptz,
    last_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_integrations_kind
    on public.integrations (kind, is_active);

create or replace function public.touch_integration()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists touch_integration on public.integrations;
create trigger touch_integration
    before update on public.integrations
    for each row execute function public.touch_integration();

-- ============================================================================
-- 2. FILA
-- ============================================================================

create table if not exists public.integration_deliveries (
    id uuid primary key default gen_random_uuid(),
    integration_id uuid not null references public.integrations(id) on delete cascade,
    order_id uuid references public.orders(id) on delete cascade,
    event text not null,
    payload jsonb not null,
    status text not null default 'pending'
        check (status in ('pending', 'sent', 'failed', 'skipped')),
    attempt integer not null default 0,
    max_attempts integer not null default 5,
    next_attempt_at timestamptz not null default now(),
    response_status integer,
    response_body text,
    error text,
    delivered_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_integration_deliveries_due
    on public.integration_deliveries (next_attempt_at)
    where status = 'pending';

create index if not exists idx_integration_deliveries_integration
    on public.integration_deliveries (integration_id, created_at desc);

-- ============================================================================
-- 3. PAYLOAD
-- ============================================================================
-- O payload do webhook já tem pedido + cliente + itens. Integrações precisam
-- também do meio de pagamento e da atribuição de tráfego, então o builder
-- ganha os dois campos. É aditivo: quem consome webhook hoje ignora chaves
-- novas.

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
        'payment_method', (
            select pm.payment_method_type
            from public.payments pm
            where pm.order_id = o.id
            order by pm.created_at desc nulls last
            limit 1
        ),
        'tracking', coalesce(o.metadata -> 'tracking', '{}'::jsonb),
        'customer', jsonb_build_object(
            'name', o.customer_name,
            'email', o.customer_email,
            'phone', o.customer_phone,
            'document', o.customer_cpf
        ),
        'items', coalesce((
            select jsonb_agg(jsonb_build_object(
                'product_id', oi.product_id,
                'product_name', p.name,
                'course_id', p.course_id,
                'kind', oi.kind,
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
-- 4. ENFILEIRAMENTO
-- ============================================================================
-- Quem consome qual evento fica aqui, não numa coluna de configuração: são
-- contratos fixos dos serviços externos, não escolha do usuário. Um evento que
-- o `kind` não usa nunca vira linha na fila.

create or replace function public.enqueue_integration_deliveries()
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

    insert into public.integration_deliveries (integration_id, order_id, event, payload)
    select i.id, new.id, v_event, v_payload
      from public.integrations i
     where i.is_active
       and case
               when i.kind = 'utmify' then v_event in (
                   'order.paid', 'order.failed', 'order.canceled', 'order.expired'
               )
               when i.kind = 'spedy' then v_event = 'order.paid'
               when i.kind = 'pixel_meta' then v_event in ('order.paid', 'order.failed')
               else false
           end
       and (
           cardinality(i.product_ids) = 0
           or exists (
               select 1 from public.order_items oi
                where oi.order_id = new.id and oi.product_id = any (i.product_ids)
           )
       );

    return new;
exception when others then
    -- Integração nunca desfaz a confirmação do pagamento.
    raise warning 'enqueue_integration_deliveries falhou no pedido %: %', new.id, sqlerrm;
    return new;
end;
$function$;

drop trigger if exists enqueue_integration_deliveries on public.orders;
create trigger enqueue_integration_deliveries
    after insert or update of status on public.orders
    for each row execute function public.enqueue_integration_deliveries();

-- Reembolso só existe em `payments`. Mesmo motivo do webhook de saída.
create or replace function public.enqueue_integration_refund()
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

    insert into public.integration_deliveries (integration_id, order_id, event, payload)
    select i.id, new.order_id, 'order.refunded', v_payload
      from public.integrations i
     where i.is_active
       and i.kind in ('utmify', 'pixel_meta')
       and (
           cardinality(i.product_ids) = 0
           or exists (
               select 1 from public.order_items oi
                where oi.order_id = new.order_id and oi.product_id = any (i.product_ids)
           )
       );

    return new;
exception when others then
    raise warning 'enqueue_integration_refund falhou no pagamento %: %', new.id, sqlerrm;
    return new;
end;
$function$;

drop trigger if exists enqueue_integration_refund on public.payments;
create trigger enqueue_integration_refund
    after update of status on public.payments
    for each row execute function public.enqueue_integration_refund();

-- PIX/boleto gerado: a UTMfy precisa do evento `waiting_payment` no momento em
-- que o código é emitido, não só na aprovação. Vale o insert do pagamento.
create or replace function public.enqueue_integration_payment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_event text;
    v_payload jsonb;
begin
    v_event := case lower(coalesce(new.payment_method_type, ''))
        when 'pix' then 'pix.generated'
        when 'pix_auto' then 'pix.generated'
        when 'boleto' then 'boleto.generated'
        when 'bolbradesco' then 'boleto.generated'
        else null
    end;

    if v_event is null then
        return new;
    end if;

    v_payload := public.build_order_webhook_payload(new.order_id, 'pending');
    if v_payload is null then
        return new;
    end if;

    insert into public.integration_deliveries (integration_id, order_id, event, payload)
    select i.id, new.order_id, v_event, v_payload
      from public.integrations i
     where i.is_active
       and i.kind = 'utmify'
       and (
           cardinality(i.product_ids) = 0
           or exists (
               select 1 from public.order_items oi
                where oi.order_id = new.order_id and oi.product_id = any (i.product_ids)
           )
       );

    return new;
exception when others then
    raise warning 'enqueue_integration_payment_created falhou no pagamento %: %', new.id, sqlerrm;
    return new;
end;
$function$;

drop trigger if exists enqueue_integration_payment_created on public.payments;
create trigger enqueue_integration_payment_created
    after insert on public.payments
    for each row execute function public.enqueue_integration_payment_created();

-- ============================================================================
-- 5. RLS
-- ============================================================================

alter table public.integrations enable row level security;
alter table public.integration_deliveries enable row level security;

drop policy if exists "Admins only" on public.integrations;
create policy "Admins only" on public.integrations
    for all to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role))
    with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins read deliveries" on public.integration_deliveries;
create policy "Admins read deliveries" on public.integration_deliveries
    for select to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- `secret` nunca sai do banco para o navegador. O admin lê tudo menos a
-- coluna da credencial; escrever pode, porque o formulário precisa salvar.
revoke all on public.integrations from anon;
revoke select on public.integrations from authenticated;
grant select (
    id, kind, name, config, has_secret, is_active,
    product_ids, last_tested_at, last_error, created_at, updated_at
) on public.integrations to authenticated;
grant insert, update, delete on public.integrations to authenticated;

-- Reenvio manual, no mesmo molde do webhook: a entrega é somente leitura, então
-- o botão passa por RPC que valida o papel e mexe só nas colunas de controle.
create or replace function public.requeue_integration_delivery(p_delivery_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
begin
    if not public.has_role(auth.uid(), 'admin'::public.app_role) then
        raise exception 'forbidden' using errcode = '42501';
    end if;

    update public.integration_deliveries
       set status = 'pending',
           attempt = 0,
           next_attempt_at = now(),
           error = null,
           response_status = null,
           response_body = null,
           delivered_at = null
     where id = p_delivery_id
       and status <> 'pending';

    return found;
end;
$function$;

revoke execute on function public.requeue_integration_delivery(uuid) from public, anon;
grant execute on function public.requeue_integration_delivery(uuid) to authenticated;

-- ============================================================================
-- 6. CRON
-- ============================================================================
-- Reaproveita o `service_role_key` já criado pelo webhook de saída; só a URL
-- da função é nova.

create or replace function public.trigger_integration_dispatch()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
    v_url text;
    v_key text;
begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'integration_dispatch_url' limit 1;
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
    null;
end;
$function$;

do $$
begin
    if exists (select 1 from cron.job where jobname = 'dispatch-integrations') then
        perform cron.unschedule('dispatch-integrations');
    end if;
end $$;

select cron.schedule(
    'dispatch-integrations',
    '* * * * *',
    $cron$select public.trigger_integration_dispatch();$cron$
);
