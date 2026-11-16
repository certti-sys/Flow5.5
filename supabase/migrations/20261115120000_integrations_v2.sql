-- IntegraX (SMS) e Pixel X (postback próprio), mais o ajuste de cardinalidade.
--
-- Sobre cardinalidade: o sistema de referência tem UMA conexão por serviço
-- (`integrarx`/`utmify`/`spedy`) e uma LISTA de pixels. A tabela única aceitava
-- duas linhas do mesmo `kind`, e a tela mostrava só a primeira — a segunda
-- virava linha órfã. O índice parcial abaixo fecha isso para os `kind` de
-- conexão e deixa os `pixel_*` com N, que é como o sistema de referência usa.

-- ============================================================================
-- 1. NOVOS KINDS
-- ============================================================================

alter table public.integrations
    drop constraint if exists integrations_kind_check;

alter table public.integrations
    add constraint integrations_kind_check check (kind in (
        'utmify', 'spedy', 'integrax',
        'pixel_meta', 'pixel_tiktok', 'pixel_google_ads', 'pixel_ga4',
        'pixel_script', 'pixel_x'
    ));

create unique index if not exists uq_integrations_connection_kind
    on public.integrations (kind)
    where kind in ('utmify', 'spedy', 'integrax');

-- ============================================================================
-- 2. CONTEXTO PRIVADO DA ENTREGA
-- ============================================================================
-- IntegraX renderiza SMS a partir de `checkout_config.sms` do produto, que é
-- configuração interna. Não pode ir no `payload`, porque o mesmo payload é
-- enviado a webhooks do cliente.

alter table public.integration_deliveries
    add column if not exists context jsonb not null default '{}'::jsonb;

-- ============================================================================
-- 3. PAYLOAD
-- ============================================================================
-- `device` alimenta o `device` da Pixel X. Vem do `payment-ops`, que é o único
-- ponto com o request original (IP e user-agent não existem no navegador).

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
        'device', coalesce(o.metadata -> 'device', '{}'::jsonb),
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

create or replace function public.enqueue_integration_deliveries()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_event text;
    v_pixelx_slug text;
    v_payload jsonb;
    v_context jsonb;
    v_product uuid;
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

    v_pixelx_slug := case v_event
        when 'order.paid' then 'pedido_pago'
        when 'order.failed' then 'pagamento_recusado'
        when 'order.canceled' then 'pedido_cancelado'
        else null
    end;

    -- Produto principal do pedido: a IntegraX lê a config de SMS dele e a
    -- config é interna, então vai em `context` (não no `payload`).
    select oi.product_id into v_product
      from public.order_items oi
     where oi.order_id = new.id
     order by (oi.kind = 'main') desc, oi.created_at
     limit 1;

    v_context := jsonb_build_object(
        'product_id', v_product,
        'sms', coalesce((
            select p.checkout_config -> 'sms'
              from public.products p
             where p.id = v_product
        ), '{}'::jsonb)
    );

    insert into public.integration_deliveries (integration_id, order_id, event, payload, context)
    select i.id, new.id, v_event, v_payload, v_context
      from public.integrations i
     where i.is_active
       and case
               when i.kind = 'utmify' then v_event in (
                   'order.paid', 'order.failed', 'order.canceled', 'order.expired'
               )
               when i.kind = 'spedy' then v_event = 'order.paid'
               when i.kind = 'pixel_meta' then v_event in ('order.paid', 'order.failed')
               -- IntegraX: só o SMS de acesso, que sai na aprovação.
               when i.kind = 'integrax' then v_event = 'order.paid'
               -- Pixel X: `events` é obrigatório na tela (ao menos um), então
               -- lista vazia não envia nada — mesmo comportamento da referência.
               when i.kind = 'pixel_x' then
                   v_pixelx_slug is not null
                   and coalesce(i.config -> 'events', '[]'::jsonb) ? v_pixelx_slug
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

-- Reembolso só existe em `payments`.
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
       and (
           i.kind in ('utmify', 'pixel_meta')
           or (i.kind = 'pixel_x'
               and coalesce(i.config -> 'events', '[]'::jsonb) ? 'reembolso')
       )
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

-- PIX/boleto gerado. A UTMfy precisa de `waiting_payment`; a IntegraX precisa da
-- cópia do código para montar o SMS, então vai em `context` (privado).
create or replace function public.enqueue_integration_payment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_event text;
    v_payload jsonb;
    v_context jsonb;
    v_pix text;
    v_product uuid;
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

    select oi.product_id into v_product
      from public.order_items oi
     where oi.order_id = new.order_id
     order by (oi.kind = 'main') desc, oi.created_at
     limit 1;

    v_pix := coalesce(
        new.raw_response ->> 'qr_code',
        new.raw_response ->> 'pix_copy_paste',
        new.raw_response -> 'point_of_interaction' -> 'transaction_data' ->> 'qr_code'
    );

    v_context := jsonb_build_object(
        'pix_code', v_pix,
        -- Configuração de SMS do produto; a IntegraX lê daqui.
        'product_id', v_product,
        'sms', coalesce((
            select p.checkout_config -> 'sms'
              from public.products p
             where p.id = v_product
        ), '{}'::jsonb)
    );

    insert into public.integration_deliveries (integration_id, order_id, event, payload, context)
    select i.id, new.order_id, v_event, v_payload, v_context
      from public.integrations i
     where i.is_active
       and (
           i.kind = 'utmify'
           or (i.kind = 'integrax' and v_event = 'pix.generated')
           or (i.kind = 'pixel_x'
               and coalesce(i.config -> 'events', '[]'::jsonb) ? 'pix_gerado')
       )
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

-- ============================================================================
-- 5. PIX NA PÁGINA DE OBRIGADO
-- ============================================================================
-- O código PIX chega hoje só por query string: recarregar a página de obrigado
-- perde o QR, e um link curto por SMS não consegue carregá-lo. Esta RPC devolve
-- o código a partir do pagamento mais recente.

create or replace function public.get_order_pix(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $function$
    select jsonb_build_object(
        'copy_paste', coalesce(
            p.raw_response ->> 'qr_code',
            p.raw_response ->> 'pix_copy_paste',
            p.raw_response -> 'point_of_interaction' -> 'transaction_data' ->> 'qr_code'
        ),
        'qr_code_base64', coalesce(
            p.raw_response ->> 'qr_code_base64',
            p.raw_response -> 'point_of_interaction' -> 'transaction_data' ->> 'qr_code_base64'
        ),
        'ticket_url', coalesce(
            p.raw_response ->> 'ticket_url',
            p.raw_response -> 'point_of_interaction' -> 'transaction_data' ->> 'ticket_url'
        )
    )
    from public.payments p
    join public.orders o on o.id = p.order_id
    where p.order_id = p_order_id
      and o.status = 'pending'
    order by p.created_at desc
    limit 1;
$function$;

revoke execute on function public.get_order_pix(uuid) from public;
grant execute on function public.get_order_pix(uuid) to anon, authenticated;

-- ============================================================================
-- 6. PIXELS DE NAVEGADOR: SEM PRODUTO = NÃO DISPARA
-- ============================================================================
-- O sistema de referência só injeta o pixel quando ele está vinculado ao
-- produto (`appliesToProduct`). Vazio aqui passa a significar "nenhum", não
-- "todos": um pixel sem produto escolhido é configuração incompleta, e contar
-- conversão de outro produto é pior do que não contar nada.

create or replace function public.get_public_integrations(p_product_id uuid default null)
returns table(kind text, config jsonb)
language sql
stable
security definer
set search_path = 'public'
as $function$
    select i.kind, i.config
      from public.integrations i
     where i.is_active
       and i.kind in ('pixel_tiktok', 'pixel_google_ads', 'pixel_ga4', 'pixel_script')
       and p_product_id is not null
       and p_product_id = any (i.product_ids)
     order by i.created_at;
$function$;
