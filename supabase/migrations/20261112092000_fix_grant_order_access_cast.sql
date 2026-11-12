-- Reparo: `null` sem cast no INSERT ... SELECT era inferido como `text` e
-- `granted_by` (uuid) rejeitava a linha. O `exception when others` do trigger
-- engolia o erro, então nada era concedido.
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

    begin
        insert into public.user_course_access (user_id, course_id, source, granted_by)
        select distinct new.user_id, p.course_id, 'checkout', null::uuid
        from public.order_items oi
        join public.products p on p.id = oi.product_id
        where oi.order_id = new.id
          and p.course_id is not null
        on conflict (user_id, course_id) do nothing;

        insert into public.user_course_categories (user_id, category)
        select distinct new.user_id, p.category
        from public.order_items oi
        join public.products p on p.id = oi.product_id
        where oi.order_id = new.id
          and p.category is not null
        on conflict (user_id, category) do nothing;
    exception when others then
        raise warning 'grant_order_access falhou no pedido %: %', new.id, sqlerrm;
    end;

    return new;
end;
$function$;
