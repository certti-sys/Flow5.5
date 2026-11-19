-- Segmento: array vazio conta como "sem filtro", não como "filtro que não casa".
--
-- O editor manda sempre `{all_customers, product_ids, course_ids}`; com
-- `product_ids: []` a versão anterior montava `v_products = '{}'` (não nulo) e
-- `oi.product_id = any ('{}')` era sempre falso — a contagem dava 0 e o envio
-- recusava a campanha, mesmo com "todos" marcado.

create or replace function public.campaign_recipients(
    p_filter jsonb default '{}'::jsonb,
    p_limit integer default null
)
returns table (email text, name text, user_id uuid)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', 'anon');
    v_all boolean := coalesce((p_filter ->> 'all_customers')::boolean, false);
    v_products uuid[] := case
        when jsonb_typeof(p_filter -> 'product_ids') = 'array'
            and jsonb_array_length(p_filter -> 'product_ids') > 0
            then array(select (jsonb_array_elements_text(p_filter -> 'product_ids'))::uuid)
        else null end;
    v_courses uuid[] := case
        when jsonb_typeof(p_filter -> 'course_ids') = 'array'
            and jsonb_array_length(p_filter -> 'course_ids') > 0
            then array(select (jsonb_array_elements_text(p_filter -> 'course_ids'))::uuid)
        else null end;
begin
    if v_role <> 'service_role' and not public.has_role(auth.uid(), 'admin') then
        raise exception 'forbidden' using errcode = '42501';
    end if;

    -- Sem nenhum filtro o resultado é vazio: "todos" precisa ser explícito,
    -- senão um filtro mal montado dispararia para a base inteira.
    if not v_all and v_products is null and v_courses is null then
        return;
    end if;

    return query
    with base as (
        select lower(p.email) as email, max(p.name) as name, (array_agg(p.id))[1] as user_id
        from public.profiles p
        where p.email is not null and length(trim(p.email)) > 3
        group by lower(p.email)
        union all
        select lower(o.customer_email), max(o.customer_name), (array_agg(o.user_id))[1]
        from public.orders o
        where o.customer_email is not null and o.status = 'paid'
        group by lower(o.customer_email)
    ),
    merged as (
        select b.email, max(b.name) as name, (array_agg(b.user_id))[1] as user_id
        from base b
        group by b.email
    )
    select m.email, m.name, m.user_id
    from merged m
    where not exists (select 1 from public.email_opt_outs eo where eo.email = m.email)
      and (
        v_products is null
        or exists (
            select 1
            from public.orders o
            join public.order_items oi on oi.order_id = o.id
            where o.status = 'paid'
              and lower(o.customer_email) = m.email
              and oi.product_id = any (v_products)
        )
      )
      and (
        v_courses is null
        or (m.user_id is not null and exists (
            select 1 from public.user_course_access uca
            where uca.user_id = m.user_id and uca.course_id = any (v_courses)
        ))
      )
    order by m.email
    limit p_limit;
end;
$function$;
