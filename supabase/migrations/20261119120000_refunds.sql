-- Reembolsos: pedido do aluno + aprovação no painel + estorno no gateway.
--
-- Espelha `RefundService`/`RefundRequest` do sistema de referência, com duas
-- diferenças deliberadas:
--
--   1. `orders.status` ganha `refunded`. Hoje os webhooks marcam estorno como
--      `failed`, o que mistura "cartão recusado" com "dinheiro devolvido" em
--      relatório e some com `order.refunded` (o trigger de webhook só emite a
--      partir de `payments.status='refunded'`).
--   2. A revogação de acesso é trigger em `orders`, não código espalhado nos
--      sete webhooks de gateway.

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
    check (status in ('draft', 'pending', 'paid', 'failed', 'canceled', 'expired', 'refunded'));

alter table public.courses
    add column if not exists refund_enabled boolean not null default false,
    add column if not exists refund_window_days integer not null default 7
        check (refund_window_days between 1 and 365);

-- ============================================================================
-- SOLICITAÇÕES
-- ============================================================================

create table if not exists public.refund_requests (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    user_id uuid not null references auth.users(id) on delete cascade,
    -- pending    = aluno pediu, admin ainda não olhou
    -- processing = enviado ao gateway (ou estorno manual pendente)
    -- completed  = dinheiro devolvido e acesso revogado
    -- rejected   = admin negou
    -- failed     = gateway recusou; cabe "Tentar novamente"
    status text not null default 'pending'
        check (status in ('pending', 'processing', 'completed', 'rejected', 'failed')),
    reason text not null,
    gateway text,
    gateway_refund_id text,
    gateway_response jsonb,
    -- Provedor sem API de estorno: o admin estorna no painel e confirma aqui.
    manual_refund_required boolean not null default false,
    last_error text,
    admin_notes text,
    reviewed_by uuid references auth.users(id) on delete set null,
    reviewed_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Uma solicitação "viva" por pedido: clique duplo do aluno não abre duas,
-- e "Tentar novamente" reaproveita a linha `failed` em vez de criar outra.
create unique index if not exists idx_refund_requests_open_unique
    on public.refund_requests (order_id)
    where status in ('pending', 'processing', 'failed');

create index if not exists idx_refund_requests_queue
    on public.refund_requests (created_at desc);

drop trigger if exists touch_refund_requests on public.refund_requests;
create trigger touch_refund_requests
    before update on public.refund_requests
    for each row execute function public.update_updated_at_column();

alter table public.refund_requests enable row level security;

drop policy if exists "Admins read refund requests" on public.refund_requests;
create policy "Admins read refund requests" on public.refund_requests
    for select to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins update refund requests" on public.refund_requests;
create policy "Admins update refund requests" on public.refund_requests
    for update to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- O aluno enxerga só as próprias solicitações (histórico no perfil).
drop policy if exists "Users read own refund requests" on public.refund_requests;
create policy "Users read own refund requests" on public.refund_requests
    for select to authenticated
    using (user_id = auth.uid());

-- Sem policy de INSERT: quem cria é a RPC abaixo, que valida janela e pedido.
-- INSERT aberto deixaria o aluno pedir reembolso de compra alheia.

-- ============================================================================
-- ELEGIBILIDADE E SOLICITAÇÃO (aluno)
-- ============================================================================

create or replace function public.refund_eligibility(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
    v_user uuid := auth.uid();
    v_course public.courses;
    v_order public.orders;
    v_existing public.refund_requests;
    v_order_id uuid;
    v_deadline timestamptz;
    v_days integer;
begin
    if v_user is null then
        raise exception 'não autenticado' using errcode = '42501';
    end if;

    select * into v_course from public.courses where id = p_course_id;
    if v_course.id is null then
        raise exception 'curso inválido' using errcode = '22023';
    end if;

    -- Pedido mais recente do aluno que dá acesso a este curso.
    select o.* into v_order
      from public.orders o
     where o.user_id = v_user
       and o.status in ('paid', 'refunded')
       and exists (
           select 1
             from public.order_items oi
             join public.products p on p.id = oi.product_id
            where oi.order_id = o.id and p.course_id = p_course_id
       )
     order by o.paid_at desc nulls last, o.created_at desc
     limit 1;

    v_order_id := v_order.id;

    select * into v_existing
      from public.refund_requests r
     where r.order_id = v_order.id
     order by r.created_at desc
     limit 1;

    if not coalesce(v_course.refund_enabled, false) then
        return jsonb_build_object(
            'enabled', false, 'can_request', false, 'reason_code', 'disabled',
            'message', 'Reembolso não disponível para este curso.',
            'window_days', v_course.refund_window_days,
            'order_id', v_order_id, 'days_remaining', null);
    end if;

    if v_order.id is null then
        return jsonb_build_object(
            'enabled', true, 'can_request', false, 'reason_code', 'no_order',
            'message', 'Nenhuma compra encontrada para este curso.',
            'window_days', v_course.refund_window_days,
            'order_id', null, 'days_remaining', null);
    end if;

    if v_order.status = 'refunded' or coalesce(v_existing.status, '') = 'completed' then
        return jsonb_build_object(
            'enabled', true, 'can_request', false, 'reason_code', 'already_refunded',
            'message', 'Este pedido já foi reembolsado.',
            'window_days', v_course.refund_window_days,
            'order_id', v_order_id, 'days_remaining', null);
    end if;

    if v_existing.id is not null and v_existing.status in ('pending', 'processing') then
        return jsonb_build_object(
            'enabled', true, 'can_request', false, 'reason_code', 'pending_request',
            'message', 'Você já tem uma solicitação de reembolso em andamento.',
            'window_days', v_course.refund_window_days,
            'order_id', v_order_id, 'days_remaining', null);
    end if;

    v_deadline := coalesce(v_order.paid_at, v_order.created_at)
                  + make_interval(days => v_course.refund_window_days);
    v_days := greatest(0, ceil(extract(epoch from (v_deadline - now())) / 86400)::integer);

    if now() > v_deadline then
        return jsonb_build_object(
            'enabled', true, 'can_request', false, 'reason_code', 'deadline_passed',
            'message', 'O prazo para solicitar reembolso expirou.',
            'window_days', v_course.refund_window_days,
            'order_id', v_order_id, 'days_remaining', 0);
    end if;

    return jsonb_build_object(
        'enabled', true, 'can_request', true, 'reason_code', 'eligible',
        'message', null,
        'window_days', v_course.refund_window_days,
        'order_id', v_order_id, 'days_remaining', v_days);
end;
$function$;

create or replace function public.request_refund(p_course_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_user uuid := auth.uid();
    v_check jsonb;
    v_order_id uuid;
    v_product_id uuid;
    v_id uuid;
begin
    if v_user is null then
        raise exception 'não autenticado' using errcode = '42501';
    end if;

    if length(trim(coalesce(p_reason, ''))) < 10 then
        raise exception 'descreva o motivo (mínimo 10 caracteres)' using errcode = '22023';
    end if;

    v_check := public.refund_eligibility(p_course_id);
    if not coalesce((v_check ->> 'can_request')::boolean, false) then
        raise exception '%', coalesce(v_check ->> 'message', 'Reembolso indisponível.')
            using errcode = '42501';
    end if;

    v_order_id := (v_check ->> 'order_id')::uuid;

    select oi.product_id into v_product_id
      from public.order_items oi
      join public.products p on p.id = oi.product_id
     where oi.order_id = v_order_id and p.course_id = p_course_id
     limit 1;

    -- Pedido que já teve uma tentativa recusada pelo gateway é reaproveitado:
    -- o índice único não deixa abrir outra linha para o mesmo pedido.
    update public.refund_requests r
       set status = 'pending',
           reason = trim(p_reason),
           last_error = null,
           manual_refund_required = false,
           reviewed_by = null,
           reviewed_at = null
     where r.order_id = v_order_id
       and r.status = 'failed'
    returning r.id into v_id;

    if v_id is not null then
        return v_id;
    end if;

    insert into public.refund_requests (order_id, product_id, user_id, reason, gateway)
    values (
        v_order_id,
        v_product_id,
        v_user,
        trim(p_reason),
        (select g.slug
           from public.payments pm
           join public.gateways g on g.id = pm.gateway_id
          where pm.order_id = v_order_id
          order by pm.created_at desc
          limit 1)
    )
    returning id into v_id;

    return v_id;
exception when unique_violation then
    -- Duas abas clicaram juntas: a linha da outra requisição já existe.
    select r.id into v_id
      from public.refund_requests r
     where r.order_id = v_order_id
       and r.status in ('pending', 'processing', 'failed')
     limit 1;
    return v_id;
end;
$function$;

revoke execute on function public.refund_eligibility(uuid) from public, anon;
revoke execute on function public.request_refund(uuid, text) from public, anon;
grant execute on function public.refund_eligibility(uuid) to authenticated;
grant execute on function public.request_refund(uuid, text) to authenticated;

-- ============================================================================
-- EFEITO: pedido reembolsado revoga acesso
-- ============================================================================

-- Substitui o bloco copiado em cada webhook de gateway. Mantém o acesso se o
-- aluno tiver outra compra paga do mesmo curso (bump, segunda matrícula).
create or replace function public.revoke_access_on_refund()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
    if new.status <> 'refunded' or coalesce(old.status, '') = 'refunded' then
        return new;
    end if;

    if new.user_id is null then
        return new;
    end if;

    delete from public.user_course_access uca
     where uca.user_id = new.user_id
       and uca.source = 'checkout'
       and exists (
           select 1
             from public.order_items oi
             join public.products p on p.id = oi.product_id
            where oi.order_id = new.id and p.course_id = uca.course_id
       )
       and not exists (
           select 1
             from public.order_items oi2
             join public.orders o2 on o2.id = oi2.order_id
             join public.products p2 on p2.id = oi2.product_id
            where o2.user_id = new.user_id
              and o2.status = 'paid'
              and o2.id <> new.id
              and p2.course_id = uca.course_id
       );

    return new;
exception when others then
    -- Reembolso nunca desfaz a mudança de status do pedido.
    raise warning 'revoke_access_on_refund falhou no pedido %: %', new.id, sqlerrm;
    return new;
end;
$function$;

drop trigger if exists revoke_access_on_refund on public.orders;
create trigger revoke_access_on_refund
    after update of status on public.orders
    for each row execute function public.revoke_access_on_refund();

-- Webhook/notificação de estorno continuam saindo de `payments` (trigger
-- `enqueue_refund_deliveries`): quem aprova o reembolso também marca o
-- pagamento como `refunded`, então o evento não duplica.
comment on table public.refund_requests is
    'Pedido de reembolso do aluno. Aprovação estorna no gateway e marca orders.status=refunded, que revoga o acesso.';
