-- O trigger em `orders` dispara no INSERT, antes de existirem `order_items`:
-- pedido criado já como `paid` não concedia nada. Separa a concessão numa
-- função chamável e adiciona trigger em `order_items` para o caso de o pedido
-- já estar pago quando os itens entram.
create or replace function public.grant_order_access_for_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_user uuid;
begin
    select user_id into v_user
    from public.orders
    where id = p_order_id and status = 'paid';

    if v_user is null then
        return;
    end if;

    begin
        insert into public.user_course_access (user_id, course_id, source, granted_by)
        select distinct v_user, p.course_id, 'checkout', null::uuid
        from public.order_items oi
        join public.products p on p.id = oi.product_id
        where oi.order_id = p_order_id
          and p.course_id is not null
        on conflict (user_id, course_id) do nothing;

        insert into public.user_course_categories (user_id, category)
        select distinct v_user, p.category
        from public.order_items oi
        join public.products p on p.id = oi.product_id
        where oi.order_id = p_order_id
          and p.category is not null
        on conflict (user_id, category) do nothing;
    exception when others then
        -- Acesso nunca deve desfazer a confirmação do pagamento.
        raise warning 'grant_order_access_for_order falhou no pedido %: %', p_order_id, sqlerrm;
    end;
end;
$function$;

create or replace function public.grant_order_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
    if new.status <> 'paid' or new.user_id is null then
        return new;
    end if;
    if tg_op = 'UPDATE' and old.status = 'paid' then
        return new;
    end if;

    perform public.grant_order_access_for_order(new.id);
    return new;
end;
$function$;

create or replace function public.grant_order_item_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
    perform public.grant_order_access_for_order(new.order_id);
    return new;
end;
$function$;

drop trigger if exists grant_order_access on public.orders;
create trigger grant_order_access
    after insert or update of status on public.orders
    for each row execute function public.grant_order_access();

drop trigger if exists grant_order_item_access on public.order_items;
create trigger grant_order_item_access
    after insert on public.order_items
    for each row execute function public.grant_order_item_access();
