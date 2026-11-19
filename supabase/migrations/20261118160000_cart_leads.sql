-- Carrinho abandonado: formulário de checkout preenchido sem pagamento.
--
-- A definição é a do sistema de referência (`CheckoutSession::STEP_FORM_FILLED`
-- sem `converted`): quem só abriu a página não entra — sem contato não há o que
-- recuperar. Quem preencheu nome/e-mail/telefone e desistiu é lead.
--
-- Tabela própria, e não `orders.status='draft'`, por dois motivos:
--   1. `payment-ops` insere um pedido novo a cada tentativa de pagamento; um
--      rascunho criado no preenchimento ficaria órfão duplicando o pedido.
--   2. Toda leitura de `orders` (painel, métricas, webhooks) passaria a ver
--      linhas que nunca foram cobrança.
--
-- `stage` = contatos automáticos já enviados (0..3). O cron calcula o próximo
-- a partir de `stage_started_at` + delay configurado.

create table if not exists public.cart_leads (
    id uuid primary key default gen_random_uuid(),
    product_id uuid references public.products(id) on delete set null,
    user_id uuid references auth.users(id) on delete set null,
    email text not null,
    name text,
    phone text,
    cpf text,
    status text not null default 'open'
        check (status in ('open', 'recovered', 'dismissed', 'expired')),
    stage integer not null default 0,
    stage_started_at timestamptz not null default now(),
    abandoned_at timestamptz,
    recovered_at timestamptz,
    last_activity_at timestamptz not null default now(),
    -- Origem: utm, device, cupom aplicado, bump selecionado.
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Um lead aberto por e-mail × produto. Quem recarrega o checkout não vira
-- duas linhas no funil; o registro existente só é atualizado.
create unique index if not exists idx_cart_leads_open_unique
    on public.cart_leads (lower(email), product_id)
    where status = 'open';

create index if not exists idx_cart_leads_queue
    on public.cart_leads (stage, stage_started_at)
    where status = 'open';

create index if not exists idx_cart_leads_created
    on public.cart_leads (created_at desc);

create or replace function public.touch_cart_leads_updated_at()
returns trigger
language plpgsql
as $function$
begin
    new.updated_at := now();
    return new;
end;
$function$;

drop trigger if exists touch_cart_leads on public.cart_leads;
create trigger touch_cart_leads
    before update on public.cart_leads
    for each row execute function public.touch_cart_leads_updated_at();

-- ============================================================================
-- CONFIGURAÇÃO DO FUNIL
-- ============================================================================

create table if not exists public.cart_recovery_settings (
    id boolean primary key default true check (id),
    enabled boolean not null default false,
    -- Minutos após o abandono para cada contato: 10 min, 5 h, 24 h.
    stage_minutes integer[] not null default '{10,300,1440}',
    channel_email boolean not null default true,
    channel_whatsapp boolean not null default false,
    -- Desconto opcional do cupom oferecido na recuperação (0 = sem desconto).
    discount_percent integer not null default 0
        check (discount_percent between 0 and 90),
    updated_at timestamptz not null default now()
);

insert into public.cart_recovery_settings (id) values (true)
on conflict (id) do nothing;

alter table public.cart_leads enable row level security;
alter table public.cart_recovery_settings enable row level security;

-- Escrita só pela edge `cart-recovery` (service role): sem policy de INSERT, um
-- visitante não consegue inflar o funil chamando o PostgREST direto.
drop policy if exists "Admins read cart leads" on public.cart_leads;
create policy "Admins read cart leads" on public.cart_leads
    for select to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins update cart leads" on public.cart_leads;
create policy "Admins update cart leads" on public.cart_leads
    for update to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins manage cart recovery settings" on public.cart_recovery_settings;
create policy "Admins manage cart recovery settings" on public.cart_recovery_settings
    for all to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role))
    with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================================
-- RECUPERAÇÃO: pedido pago fecha o lead
-- ============================================================================

-- Casa por e-mail + produto do pedido pago. Um comprador pode ter dois leads
-- abertos (dois produtos); fecha só o do produto comprado.
create or replace function public.mark_cart_leads_recovered()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
    if new.status <> 'paid' or coalesce(old.status, '') = 'paid' then
        return new;
    end if;

    update public.cart_leads l
       set status = 'recovered',
           recovered_at = now(),
           updated_at = now()
     where l.status = 'open'
       and new.customer_email is not null
       and lower(l.email) = lower(new.customer_email)
       and (
           l.product_id is null
           or exists (
               select 1 from public.order_items oi
                where oi.order_id = new.id
                  and oi.product_id = l.product_id
           )
       );

    return new;
exception when others then
    -- Funil nunca desfaz o pagamento.
    raise warning 'mark_cart_leads_recovered falhou no pedido %: %', new.id, sqlerrm;
    return new;
end;
$function$;

drop trigger if exists mark_cart_leads_recovered on public.orders;
create trigger mark_cart_leads_recovered
    after update of status on public.orders
    for each row execute function public.mark_cart_leads_recovered();

-- ============================================================================
-- CAPTURA DO LEAD (chamada pelo checkout público)
-- ============================================================================

-- `security definer` com `revoke insert`: o visitante não pode escolher
-- `status`, `stage` nem `recovered_at`, só os próprios dados. Chamar o
-- PostgREST direto em `cart_leads` não passa.
--
-- O abandono só é marcado depois do grace configurado (`stage_minutes[1]`,
-- 10 min). Até lá o lead fica `open` com `abandoned_at` nulo e não entra na
-- contagem do funil como perda — quem preenche e paga em 3 minutos não é
-- abandono.
create or replace function public.capture_cart_lead(
    p_product_id uuid,
    p_email text,
    p_name text default null,
    p_phone text default null,
    p_cpf text default null,
    p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_id uuid;
    v_email text := lower(trim(coalesce(p_email, '')));
begin
    if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'e-mail inválido' using errcode = '22023';
    end if;

    if p_product_id is null or not exists (select 1 from public.products where id = p_product_id) then
        raise exception 'produto inválido' using errcode = '22023';
    end if;

    insert into public.cart_leads (product_id, email, name, phone, cpf, metadata, user_id)
    values (
        p_product_id,
        v_email,
        nullif(trim(coalesce(p_name, '')), ''),
        nullif(trim(coalesce(p_phone, '')), ''),
        nullif(trim(coalesce(p_cpf, '')), ''),
        coalesce(p_metadata, '{}'::jsonb),
        auth.uid()
    )
    on conflict (lower(email), product_id) where status = 'open'
    do update set
        name = coalesce(excluded.name, public.cart_leads.name),
        phone = coalesce(excluded.phone, public.cart_leads.phone),
        cpf = coalesce(excluded.cpf, public.cart_leads.cpf),
        user_id = coalesce(public.cart_leads.user_id, excluded.user_id),
        last_activity_at = now(),
        metadata = public.cart_leads.metadata || excluded.metadata
    returning id into v_id;

    return v_id;
end;
$function$;

revoke execute on function public.capture_cart_lead(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.capture_cart_lead(uuid, text, text, text, text, jsonb) to anon, authenticated;

-- ============================================================================
-- WEBHOOK `cart.abandoned`
-- ============================================================================

-- Emitido pelo drenador (`cart-recovery`), não por trigger: o abandono é o
-- resultado de uma janela de tempo, não de uma escrita. A função monta o
-- payload a partir do lead e enfileira para os endpoints inscritos.
create or replace function public.enqueue_cart_abandoned_webhook(p_lead_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_lead public.cart_leads;
    v_payload jsonb;
begin
    select * into v_lead from public.cart_leads where id = p_lead_id;
    if v_lead.id is null then
        return;
    end if;

    v_payload := jsonb_build_object(
        'event', 'cart.abandoned',
        'lead_id', v_lead.id,
        'product_id', v_lead.product_id,
        'product_name', (select name from public.products where id = v_lead.product_id),
        'customer', jsonb_build_object(
            'name', v_lead.name,
            'email', v_lead.email,
            'phone', v_lead.phone
        ),
        'stage', v_lead.stage,
        'abandoned_at', v_lead.abandoned_at,
        'checkout_url', (select '/c/' || checkout_slug from public.products where id = v_lead.product_id),
        'metadata', v_lead.metadata
    );

    insert into public.webhook_deliveries (endpoint_id, event, payload)
    select e.id, 'cart.abandoned', v_payload
    from public.webhook_endpoints e
    where e.is_active and 'cart.abandoned' = any (e.events);
exception when others then
    raise warning 'enqueue_cart_abandoned_webhook falhou no lead %: %', p_lead_id, sqlerrm;
end;
$function$;

-- ============================================================================
-- CRON
-- ============================================================================

-- Mesmo desenho dos outros drenadores: só age se o secret existir.
--
--   select vault.create_secret(
--     'https://<ref>.supabase.co/functions/v1/cart-recovery',
--     'cart_recovery_dispatch_url');
create or replace function public.trigger_cart_recovery()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
    v_url text;
    v_key text;
begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'cart_recovery_dispatch_url' limit 1;
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key' limit 1;
    if v_url is null or v_key is null then
        return;
    end if;

    perform net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_key
        ),
        body := '{"action":"sweep"}'::jsonb,
        timeout_milliseconds := 15000
    );
exception when others then
    null;
end;
$function$;

do $$
begin
    if exists (select 1 from cron.job where jobname = 'cart-recovery') then
        perform cron.unschedule('cart-recovery');
    end if;
end;
$$;

select cron.schedule(
    'cart-recovery',
    '*/5 * * * *',
    'select public.trigger_cart_recovery();'
);

-- ============================================================================
-- EVENTO NO CATÁLOGO
-- ============================================================================
-- `cart.abandoned` passa a existir de verdade: o drenador emite quando a
-- sessão estoura o grace. Os endpoints escolhem o evento na tela de webhooks.
comment on table public.cart_leads is
    'Formulário de checkout preenchido sem pagamento. Fonte do evento cart.abandoned e da recuperação automática.';
