-- Fase 8 — RLS: fecha as 30 tabelas com a policy "Authenticated all access"
-- (`using true` + `with check true`).
--
-- Antes: qualquer aluno logado lia e escrevia tudo nelas. Testado em produção
-- com uma conta sem role admin: lia `gateway_credentials.secret_key` (chave do
-- Stripe/MP), lia pedidos de outros alunos, e `PATCH /courses` devolvia 204.
--
-- Regra aplicada, por tipo de dado:
--
--   * catálogo/conteúdo que a área do aluno realmente consulta (curso, aula,
--     módulo, material, produto, carrossel, order bump) — leitura continua
--     liberada para `authenticated`; escrita vira admin.
--   * dado pessoal/financeiro (pedido, pagamento, item, acesso, conquista) —
--     leitura "o próprio ou admin"; escrita admin.
--   * tabela que o cliente nem lê (log, credencial, gateway, settings de
--     canal, tabela vazia) — admin-only.
--
-- As leituras com `using (true)` que permanecem são deliberadas e estão
-- comentadas uma por uma; não são sobra da policy antiga.

-- ============================================================
-- 1. Derruba a policy permissiva em todas as tabelas
-- ============================================================

do $$
declare
    r record;
begin
    for r in
        select tablename
          from pg_policies
         where schemaname = 'public'
           and policyname = 'Authenticated all access'
    loop
        execute format(
            'drop policy if exists %I on public.%I',
            'Authenticated all access', r.tablename
        );
    end loop;
end;
$$;

-- ============================================================
-- 2. Admin gerencia tudo (as 30 tabelas)
-- ============================================================

do $$
declare
    t text;
    tabelas text[] := array[
        -- leitura do aluno preservada (tratada na seção 3)
        'achievements', 'carousels', 'carousel_courses', 'courses',
        'lesson_materials', 'lessons', 'modules', 'order_bumps', 'products',
        -- leitura "próprio ou admin" (seção 4)
        'orders', 'order_items', 'payments', 'user_achievements',
        'user_course_access',
        -- admin-only
        'audit_logs', 'course_categories', 'customers', 'email_settings',
        'entitlements', 'gateway_credentials', 'gateways',
        'message_templates', 'platform_settings', 'prices', 'subscriptions',
        'user_course_categories', 'webhook_events', 'whatsapp_logs',
        'whatsapp_settings'
    ];
begin
    foreach t in array tabelas loop
        execute format('drop policy if exists %I on public.%I', 'Admins manage ' || t, t);
        execute format(
            'create policy %I on public.%I for all to authenticated using (public.has_role(auth.uid(), ''admin''::public.app_role)) with check (public.has_role(auth.uid(), ''admin''::public.app_role))',
            'Admins manage ' || t, t
        );
    end loop;
end;
$$;

-- ============================================================
-- 3. Leitura de catálogo/conteúdo liberada para o aluno
-- ============================================================
-- Necessário para Dashboard, Course, CourseInfo, Lesson e o próprio checkout
-- funcionarem. Nenhuma dessas tabelas tem dado de terceiro.

create policy "Authenticated read achievements" on public.achievements
    for select to authenticated using (true);

create policy "Authenticated read carousels" on public.carousels
    for select to authenticated using (true);

create policy "Authenticated read carousel_courses" on public.carousel_courses
    for select to authenticated using (true);

create policy "Authenticated read courses" on public.courses
    for select to authenticated using (true);

create policy "Authenticated read lesson_materials" on public.lesson_materials
    for select to authenticated using (true);

create policy "Authenticated read lessons" on public.lessons
    for select to authenticated using (true);

create policy "Authenticated read modules" on public.modules
    for select to authenticated using (true);

create policy "Authenticated read order_bumps" on public.order_bumps
    for select to authenticated using (true);

-- Produtos: o admin precisa ver os inativos no painel; o comprador precisa do
-- produto do próprio link. `anon` continua restrito a `active = true`.
create policy "Authenticated read products" on public.products
    for select to authenticated
    using (active or public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- 4. Leitura "o próprio ou admin"
-- ============================================================
-- `orders`/`payments`/`order_items` não são lidos pela área do aluno hoje, mas
-- a policy de audiência de `notifications` (audience='product') consulta
-- `order_items`+`orders` com os privilégios de quem lê a notificação. Fechar
-- totalmente quebraria a notificação por produto.

create policy "Users read own orders" on public.orders
    for select to authenticated
    using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Users read own order items" on public.order_items
    for select to authenticated
    using (
        exists (
            select 1 from public.orders o
             where o.id = order_items.order_id
               and o.user_id = auth.uid()
        )
        or public.has_role(auth.uid(), 'admin'::public.app_role)
    );

create policy "Users read own payments" on public.payments
    for select to authenticated
    using (
        exists (
            select 1 from public.orders o
             where o.id = payments.order_id
               and o.user_id = auth.uid()
        )
        or public.has_role(auth.uid(), 'admin'::public.app_role)
    );

create policy "Users read own access" on public.user_course_access
    for select to authenticated
    using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Users read own achievements" on public.user_achievements
    for select to authenticated
    using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- 5. user_progress: só derruba a permissiva
-- ============================================================
-- A tabela já tinha policies de dono (insert/update/select/delete) e uma de
-- admin. A permissiva já foi removida na seção 1.

-- ============================================================
-- 6. Cupons: escrita era aberta a `authenticated`
-- ============================================================
-- `validate-coupon` roda com o JWT do visitante e lê `coupons` +`coupon_products`
-- filtrando `is_active = true`; as policies públicas abaixo cobrem isso.

drop policy if exists "Authenticated users can insert coupons" on public.coupons;
drop policy if exists "Users can update coupons" on public.coupons;
drop policy if exists "Users can delete coupons" on public.coupons;
drop policy if exists "Authenticated users can view coupons" on public.coupons;

create policy "Admins manage coupons" on public.coupons
    for all to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role))
    with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Authenticated users can insert coupon_products" on public.coupon_products;
drop policy if exists "Users can update coupon_products" on public.coupon_products;
drop policy if exists "Users can delete coupon_products" on public.coupon_products;
drop policy if exists "Authenticated users can view coupon_products" on public.coupon_products;

create policy "Admins manage coupon_products" on public.coupon_products
    for all to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role))
    with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- `coupon_usage` só é escrita por `payment-ops` (service role).
drop policy if exists "Authenticated users can insert coupon_usage" on public.coupon_usage;
drop policy if exists "Users can update coupon_usage" on public.coupon_usage;
drop policy if exists "Users can delete coupon_usage" on public.coupon_usage;
drop policy if exists "Authenticated users can view coupon_usage" on public.coupon_usage;

create policy "Admins read coupon_usage" on public.coupon_usage
    for select to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- 7. products: sobravam quatro policies permissivas de escrita
-- ============================================================

drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Users can update products" on public.products;
drop policy if exists "Users can delete products" on public.products;
drop policy if exists "Authenticated users can view products" on public.products;

-- ============================================================
-- 8. Comentários: policies duplicadas de DELETE de admin
-- ============================================================

drop policy if exists "Admins can delete any comment" on public.comments;
