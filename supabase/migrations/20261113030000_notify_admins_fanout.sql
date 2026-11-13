-- Corrige o fan-out do aviso automático de venda.
--
-- `event_key` era único global, então `insert ... select from user_roles` gravava
-- uma linha e descartava as demais no `on conflict do nothing` — com dois admins,
-- só um recebia. A idempotência tem que ser por destinatário.

drop index if exists public.idx_notifications_event_key;

-- `audience_id` null (aviso global) não colide: NULL é distinto em índice
-- único. Só importa aqui porque `event_key` só é usado em aviso por usuário.
create unique index if not exists idx_notifications_event_key_audience
    on public.notifications (event_key, audience_id)
    where event_key is not null;

create or replace function public.notify_admins()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_title text;
    v_message text;
    v_type text;
    v_event_key text;
    v_amount text;
begin
    if tg_op = 'UPDATE' and new.status is not distinct from old.status then
        return new;
    end if;
    if tg_op = 'INSERT' and new.status <> 'paid' then
        return new;
    end if;

    v_event_key := 'order_' || new.status || ':' || new.id;
    v_amount := to_char(coalesce(new.total_amount, 0) / 100.0, 'FM999G999G990D00');

    if new.status = 'paid' then
        v_title := 'Venda aprovada';
        v_type := 'success';
        v_message := format('%s - R$ %s', coalesce(new.customer_name, new.customer_email, 'Cliente'), v_amount);
    elsif new.status = 'failed' then
        v_title := 'Pagamento recusado';
        v_type := 'warning';
        v_message := format('%s - R$ %s', coalesce(new.customer_name, new.customer_email, 'Cliente'), v_amount);
    else
        return new;
    end if;

    insert into public.notifications (
        audience, audience_id, title, message, type, link, event_key, publish_at
    )
    select 'user', ur.user_id, v_title, v_message, v_type, '/admin/vendas', v_event_key, now()
    from public.user_roles ur
    where ur.role = 'admin'
    on conflict (event_key, audience_id) where event_key is not null do nothing;

    return new;
exception when others then
    -- Aviso é conveniência; nunca derruba a confirmação do pagamento.
    raise warning 'notify_admins falhou no pedido %: %', new.id, sqlerrm;
    return new;
end;
$function$;

create or replace function public.notify_admins_refund()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_customer text;
    v_amount text;
begin
    if new.status <> 'refunded' or coalesce(old.status, '') = 'refunded' then
        return new;
    end if;

    select coalesce(o.customer_name, o.customer_email, 'Cliente'),
           to_char(coalesce(new.amount, 0) / 100.0, 'FM999G999G990D00')
      into v_customer, v_amount
      from public.orders o
     where o.id = new.order_id;

    insert into public.notifications (
        audience, audience_id, title, message, type, link, event_key, publish_at
    )
    select 'user', ur.user_id, 'Reembolso processado',
           format('%s - R$ %s', v_customer, v_amount), 'warning',
           '/admin/vendas', 'payment_refunded:' || new.id, now()
    from public.user_roles ur
    where ur.role = 'admin'
    on conflict (event_key, audience_id) where event_key is not null do nothing;

    return new;
exception when others then
    raise warning 'notify_admins_refund falhou no pagamento %: %', new.id, sqlerrm;
    return new;
end;
$function$;
