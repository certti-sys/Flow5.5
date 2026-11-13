-- Notificações internas: destinatário, agendamento e validade.
--
-- Antes: `notifications` era um mural global com RLS `qual = true` nas duas
-- tabelas. Qualquer aluno autenticado publicava (ou apagava) aviso para a base
-- inteira, e não havia como mirar um curso, um produto ou um usuário.
--
-- Modelo: uma linha por aviso, com `audience`/`audience_id` definindo o
-- público. A leitura é resolvida na policy — o cliente não filtra nada.
-- `publish_at` cobre "manutenção agendada" e `expires_at` tira o aviso do ar
-- sozinho, sem ninguém precisar lembrar de apagar.

alter table public.notifications
    add column if not exists audience text not null default 'all',
    add column if not exists audience_id uuid,
    add column if not exists publish_at timestamptz not null default now(),
    add column if not exists expires_at timestamptz,
    -- Chave de evento para avisos automáticos (ex.: 'order_paid:123').
    -- Evita duplicar quando o mesmo webhook chega duas vezes.
    add column if not exists event_key text;

alter table public.notifications drop constraint if exists notifications_audience_check;
alter table public.notifications add constraint notifications_audience_check
    check (audience in ('all', 'user', 'course', 'product'));

alter table public.notifications drop constraint if exists notifications_audience_target_check;
alter table public.notifications add constraint notifications_audience_target_check
    check (
        (audience = 'all' and audience_id is null)
        or (audience <> 'all' and audience_id is not null)
    );

-- O sino lê sempre o mesmo recorte: publicados, mais novos primeiro.
-- Sem predicado com `now()` (não é imutável e o índice seria rejeitado).
create index if not exists idx_notifications_feed
    on public.notifications (publish_at desc);

create unique index if not exists idx_notifications_event_key
    on public.notifications (event_key)
    where event_key is not null;

-- Uma leitura por usuário/aviso. Sem unique, o insert podia duplicar.
create unique index if not exists idx_notification_reads_unique
    on public.notification_reads (notification_id, user_id);

-- ============================================================================
-- RLS
-- ============================================================================

drop policy if exists "Authenticated all access" on public.notifications;
drop policy if exists "Authenticated all access" on public.notification_reads;

drop policy if exists "Read within audience" on public.notifications;
create policy "Read within audience" on public.notifications
    for select to authenticated
    using (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        or (
            publish_at <= now()
            and (expires_at is null or expires_at > now())
            and case audience
                when 'all' then true
                when 'user' then audience_id = auth.uid()
                when 'course' then exists (
                    select 1 from public.user_course_access a
                    where a.user_id = auth.uid() and a.course_id = notifications.audience_id
                )
                when 'product' then exists (
                    select 1
                    from public.order_items oi
                    join public.orders o on o.id = oi.order_id
                    where oi.product_id = notifications.audience_id
                      and o.user_id = auth.uid()
                      and o.status = 'paid'
                )
                else false
            end
        )
    );

drop policy if exists "Admins write notifications" on public.notifications;
create policy "Admins write notifications" on public.notifications
    for all to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role))
    with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Read own reads" on public.notification_reads;
create policy "Read own reads" on public.notification_reads
    for select to authenticated
    using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role));

-- Só o dono marca como lido, e só para o próprio id.
drop policy if exists "Mark own reads" on public.notification_reads;
create policy "Mark own reads" on public.notification_reads
    for insert to authenticated
    with check (user_id = auth.uid());

drop policy if exists "Delete own reads" on public.notification_reads;
create policy "Delete own reads" on public.notification_reads
    for delete to authenticated
    using (user_id = auth.uid());

-- ============================================================================
-- AVISO AUTOMÁTICO DE VENDA (sino do admin)
-- ============================================================================
-- Na referência isso é um listener por evento; aqui um trigger cobre os 8
-- gateways, o polling e a aprovação manual de uma vez.

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
    on conflict (event_key) where event_key is not null do nothing;

    return new;
exception when others then
    -- Aviso é conveniência; nunca derruba a confirmação do pagamento.
    raise warning 'notify_admins falhou no pedido %: %', new.id, sqlerrm;
    return new;
end;
$function$;

drop trigger if exists notify_admins_on_order on public.orders;
create trigger notify_admins_on_order
    after insert or update of status on public.orders
    for each row execute function public.notify_admins();

-- Reembolso não muda `orders.status` (só `payments`), então vem de lá.
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
    on conflict (event_key) where event_key is not null do nothing;

    return new;
exception when others then
    raise warning 'notify_admins_refund falhou no pagamento %: %', new.id, sqlerrm;
    return new;
end;
$function$;

drop trigger if exists notify_admins_on_refund on public.payments;
create trigger notify_admins_on_refund
    after update of status on public.payments
    for each row execute function public.notify_admins_refund();
