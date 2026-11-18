-- Catálogo de webhooks de saída: eventos que hoje conseguem acontecer.
--
-- O sistema de referência anuncia 13 eventos, mas metade deles (assinaturas e
-- carrinho abandonado) pressupõe features que não existem aqui. Anunciar um
-- evento no painel que nunca dispara é pior que não ter o evento: o integrador
-- configura, testa com o pedido dele e conclui que a integração está quebrada.
-- Por isso entram agora os 9 que têm gatilho real:
--
--   order.pending           orders.status = 'pending' (criação)
--   order.paid              orders.status = 'paid'
--   order.failed            orders.status = 'failed'
--   order.canceled          orders.status = 'canceled'
--   order.expired           orders.status = 'expired'
--   order.refunded          payments.status = 'refunded'
--   access.ready            user_course_access concedido
--   payment.pix_generated   payments inserido com método pix
--   payment.boleto_generated payments inserido com método boleto
--
-- `cart.abandoned` entra na fase do funil; `subscription.*` quando houver
-- assinatura. O painel foi marcado para não anuncia-los antes disso.

-- ============================================================================
-- 1. PEDIDO PENDENTE
-- ============================================================================

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

    v_event := case new.status
        when 'pending' then 'order.pending'
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
    -- Integração nunca pode desfazer a criação/confirmação do pedido
    -- (mesma regra do trigger `grant_order_access`).
    raise warning 'enqueue_webhook_deliveries falhou no pedido %: %', new.id, sqlerrm;
    return new;
end;
$function$;

-- ============================================================================
-- 2. ACESSO LIBERADO
-- ============================================================================
-- É o evento que o integrador mais usa para disparar e-mail de boas-vindas ou
-- criar o usuário no sistema dele. Dispara por acesso concedido, não por
-- pedido pago: um pedido com dois cursos gera dois acessos.

create or replace function public.enqueue_access_ready_deliveries()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_payload jsonb;
begin
    v_payload := jsonb_build_object(
        'access_id', new.id,
        'user_id', new.user_id,
        'course_id', new.course_id,
        'source', new.source,
        'granted_at', new.granted_at
    );

    insert into public.webhook_deliveries (endpoint_id, event, payload)
    select e.id, 'access.ready', v_payload
    from public.webhook_endpoints e
    where e.is_active and 'access.ready' = any (e.events);

    return new;
exception when others then
    -- Perder um webhook é ruim; desfazer a concessão de acesso é pior.
    raise warning 'enqueue_access_ready_deliveries falhou no acesso %: %', new.id, sqlerrm;
    return new;
end;
$function$;

drop trigger if exists enqueue_access_ready_deliveries on public.user_course_access;
create trigger enqueue_access_ready_deliveries
    after insert on public.user_course_access
    for each row execute function public.enqueue_access_ready_deliveries();

-- ============================================================================
-- 3. PIX E BOLETO GERADOS
-- ============================================================================
-- O payload do pedido não carrega o QR/linha digitável porque o `orders` nasce
-- antes da cobrança. Aqui a própria linha de `payments` já tem o `raw_response`
-- com o código, então o evento sai completo — é o que permite montar um
-- "recuperação de PIX não pago" do lado do integrador.

create or replace function public.enqueue_payment_created_deliveries()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_event text;
    v_payload jsonb;
    v_raw jsonb;
begin
    -- `payment_method_type` guarda o id do método do provedor ('pix',
    -- 'bolbradesco', 'ticket', 'payment_type_id'), então casamos por
    -- substring em vez de igualdade exata.
    v_event := case
        when lower(coalesce(new.payment_method_type, '')) like '%pix%'
            then 'payment.pix_generated'
        when lower(coalesce(new.payment_method_type, '')) similar to '%(boleto|bolbradesco|ticket|bank_slip)%'
            then 'payment.boleto_generated'
        else null
    end;

    if v_event is null then
        return new;
    end if;

    v_raw := case
        when jsonb_typeof(new.raw_response) = 'object' then new.raw_response
        when jsonb_typeof(new.raw_response) = 'string'
            then (new.raw_response #>> '{}')::jsonb
        else '{}'::jsonb
    end;

    v_payload := public.build_order_webhook_payload(new.order_id, 'pending');
    if v_payload is null then
        v_payload := '{}'::jsonb;
    end if;

    v_payload := v_payload || jsonb_build_object(
        'event', v_event,
        'payment', jsonb_build_object(
            'payment_id', new.id,
            'external_id', new.external_payment_id,
            'method', new.payment_method_type,
            'amount', new.amount,
            'status', new.status,
            'qr_code', coalesce(
                v_raw #>> '{point_of_interaction,transaction_data,qr_code}',
                v_raw #>> '{pix,qr_code}',
                v_raw ->> 'qr_code'
            ),
            'qr_code_base64', coalesce(
                v_raw #>> '{point_of_interaction,transaction_data,qr_code_base64}',
                v_raw ->> 'qr_code_base64'
            ),
            'ticket_url', coalesce(
                v_raw ->> 'ticket_url',
                v_raw ->> 'bankSlipUrl',
                v_raw ->> 'invoiceUrl'
            ),
            'barcode', coalesce(
                v_raw ->> 'barcode',
                v_raw #>> '{identificationField}'
            ),
            'expires_at', coalesce(
                v_raw ->> 'date_of_expiration',
                v_raw ->> 'dueDate'
            )
        )
    );

    insert into public.webhook_deliveries (endpoint_id, event, payload)
    select e.id, v_event, v_payload
    from public.webhook_endpoints e
    where e.is_active and v_event = any (e.events);

    return new;
exception when others then
    raise warning 'enqueue_payment_created_deliveries falhou no pagamento %: %', new.id, sqlerrm;
    return new;
end;
$function$;

drop trigger if exists enqueue_payment_created_deliveries on public.payments;
create trigger enqueue_payment_created_deliveries
    after insert on public.payments
    for each row execute function public.enqueue_payment_created_deliveries();

-- ============================================================================
-- 4. ENTREGA DE TESTE
-- ============================================================================
-- O botão "Testar" do painel enfileira uma entrega sintética. Reaproveitar a
-- fila em vez de fazer um POST direto significa que o teste aparece no log com
-- o status HTTP real, o mesmo caminho de código da entrega de verdade.
--
-- `event = 'test.ping'` no log sinaliza que não é um evento de negócio; o
-- integrador filtra pelo header `X-Flow-Event`.

create or replace function public.enqueue_test_webhook(p_endpoint_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_endpoint public.webhook_endpoints;
    v_delivery_id uuid;
begin
    if not public.has_role(auth.uid(), 'admin'::public.app_role) then
        raise exception 'forbidden' using errcode = '42501';
    end if;

    select * into v_endpoint
      from public.webhook_endpoints
     where id = p_endpoint_id;

    if v_endpoint.id is null then
        raise exception 'endpoint não encontrado' using errcode = 'P0002';
    end if;

    insert into public.webhook_deliveries (endpoint_id, event, payload)
    values (
        v_endpoint.id,
        'test.ping',
        jsonb_build_object(
            'event', 'test.ping',
            'test', true,
            'sent_at', now(),
            'message', 'Payload de teste do Flow. Nenhum pedido foi criado.'
        )
    )
    returning id into v_delivery_id;

    return v_delivery_id;
end;
$function$;

revoke execute on function public.enqueue_test_webhook(uuid) from public, anon;
grant execute on function public.enqueue_test_webhook(uuid) to authenticated;
