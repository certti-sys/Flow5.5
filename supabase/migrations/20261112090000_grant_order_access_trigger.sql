-- Concessão de acesso automática ao confirmar pagamento.
--
-- Antes disso cada webhook (8 gateways) e o payment-ops repetiam o mesmo
-- insert lendo apenas `products.course_id`; produto com `category` (venda por
-- trilha) nunca liberava nada. Centralizar num trigger cobre todos os
-- gateways, o polling do `check_payment_status` e qualquer caminho novo.

-- Sem unique, `on conflict (user_id, category)` do trigger não protege nada.
create unique index if not exists idx_user_course_categories_unique
    on public.user_course_categories (user_id, category);

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
        -- Acesso nunca deve desfazer a confirmação do pagamento.
        raise warning 'grant_order_access falhou no pedido %: %', new.id, sqlerrm;
    end;

    return new;
end;
$function$;

drop trigger if exists grant_order_access on public.orders;
create trigger grant_order_access
    after insert or update of status on public.orders
    for each row execute function public.grant_order_access();
