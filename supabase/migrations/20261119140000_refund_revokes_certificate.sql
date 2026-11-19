-- Fase 10 — estorno completo: revoga certificado e acesso de qualquer origem.
--
-- Duas dívidas fechadas aqui:
--
-- 1. `certificates` não tinha como ser invalidado. O curso fechava após o
--    reembolso, mas o certificado continuava acessível pelo próprio link.
--    Ganha `revoked_at`; o trigger de reembolso preenche e o aluno precisa
--    reemitir (nova linha) se refizer o curso.
--
-- 2. `revoke_access_on_refund` só apagava `source = 'checkout'`. Acesso
--    concedido por `manual`, `import` ou `webhook` sobrevivia ao reembolso:
--    o aluno pegava o dinheiro de volta e continuava com o curso.
--
-- Regra única nos dois casos: se ainda existe outra compra paga do mesmo
-- curso, nada é revogado. Erro nunca desfaz a mudança de status do pedido.

alter table public.certificates
    add column if not exists revoked_at timestamptz;

comment on column public.certificates.revoked_at is
    'Data em que o certificado foi invalidado (estorno do pedido). Linha revogada não ocupa a vaga do índice único ativo.';

-- Consultas da área do aluno e do painel filtram por validade.
create index if not exists idx_certificates_active
    on public.certificates (user_id, course_id)
    where revoked_at is null;

-- Certificado revogado deixa de ocupar a vaga do unique global: o aluno que
-- refizer o curso emite uma linha nova, e o histórico do que foi invalidado
-- continua auditável. Sem isso, reemitir estouraria a constraint antiga.
alter table public.certificates
    drop constraint if exists certificates_user_id_course_id_key;

create unique index if not exists idx_certificates_active_unique
    on public.certificates (user_id, course_id)
    where revoked_at is null;

create or replace function public.revoke_access_on_refund()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_courses uuid[];
begin
    if new.status <> 'refunded' or coalesce(old.status, '') = 'refunded' then
        return new;
    end if;

    if new.user_id is null then
        return new;
    end if;

    select array_agg(distinct p.course_id)
      into v_courses
      from public.order_items oi
      join public.products p on p.id = oi.product_id
     where oi.order_id = new.id
       and p.course_id is not null;

    if v_courses is null then
        return new;
    end if;

    -- Sem filtro de `source`: o dinheiro voltou, o curso sai do ar. Se o
    -- admin quiser manter alguém, concede de novo depois.
    delete from public.user_course_access uca
     where uca.user_id = new.user_id
       and uca.course_id = any (v_courses)
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

    update public.certificates c
       set revoked_at = now()
     where c.user_id = new.user_id
       and c.course_id = any (v_courses)
       and c.revoked_at is null
       and not exists (
           select 1
             from public.order_items oi3
             join public.orders o3 on o3.id = oi3.order_id
             join public.products p3 on p3.id = oi3.product_id
            where o3.user_id = new.user_id
              and o3.status = 'paid'
              and o3.id <> new.id
              and p3.course_id = c.course_id
       );

    return new;
exception when others then
    raise warning 'revoke_access_on_refund falhou no pedido %: %', new.id, sqlerrm;
    return new;
end;
$function$;

-- Nova compra paga do curso revalida o certificado que o estorno revogou.
-- Mantém a linha (unique user_id, course_id) e o mesmo link.
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
