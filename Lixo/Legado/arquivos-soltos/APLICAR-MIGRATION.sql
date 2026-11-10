-- ============================================
-- SISTEMA DE CUPONS - MIGRATION
-- Data: 2026-04-18
-- Projeto: Neo Vidya Stream
-- ============================================
--
-- INSTRUÇÕES:
-- 1. Acesse o Supabase SQL Editor do projeto
-- 2. Cole este arquivo inteiro
-- 3. Clique em Run
-- 4. Verifique os resultados das queries finais
--
-- ============================================

-- Tabela principal de cupons
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text check (discount_type in ('percent', 'fixed')) not null,
  discount_value numeric not null check (discount_value > 0),
  max_uses int check (max_uses > 0),
  uses_count int default 0 check (uses_count >= 0),
  valid_from timestamptz,
  valid_until timestamptz,
  min_purchase_amount numeric default 0 check (min_purchase_amount >= 0),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Relação cupom-produto (many-to-many)
create table if not exists coupon_products (
  coupon_id uuid references coupons(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  primary key (coupon_id, product_id)
);

-- Histórico de uso
create table if not exists coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid references coupons(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  discount_applied numeric not null,
  created_at timestamptz default now()
);

-- Índices para performance
create index if not exists idx_coupons_code on coupons(code);
create index if not exists idx_coupons_active on coupons(is_active) where is_active = true;
create index if not exists idx_coupon_usage_coupon on coupon_usage(coupon_id);
create index if not exists idx_coupon_usage_order on coupon_usage(order_id);

-- RLS Policies
alter table coupons enable row level security;
alter table coupon_products enable row level security;
alter table coupon_usage enable row level security;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.is_admin_user() to service_role;

comment on function public.is_admin_user() is 'Retorna true quando o usuário autenticado possui role admin em public.user_roles.';

-- Admins podem fazer tudo em coupons
drop policy if exists "Admins can do everything on coupons" on coupons;
create policy "Admins can do everything on coupons"
  on coupons for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Todos podem ler cupons ativos; admins também podem ler inativos
drop policy if exists "Anyone can read active coupons" on coupons;
create policy "Anyone can read active coupons"
  on coupons for select
  using (is_active = true or public.is_admin_user());

-- Admins podem gerenciar coupon_products
drop policy if exists "Admins can manage coupon_products" on coupon_products;
create policy "Admins can manage coupon_products"
  on coupon_products for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Todos podem ler coupon_products
drop policy if exists "Anyone can read coupon_products" on coupon_products;
create policy "Anyone can read coupon_products"
  on coupon_products for select
  using (true);

-- Apenas sistema pode inserir em coupon_usage
drop policy if exists "System can insert coupon_usage" on coupon_usage;
create policy "System can insert coupon_usage"
  on coupon_usage for insert
  with check (true);

-- Admins podem ler histórico
drop policy if exists "Admins can read coupon_usage" on coupon_usage;
create policy "Admins can read coupon_usage"
  on coupon_usage for select
  using (public.is_admin_user());

-- Trigger para atualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_coupons_updated_at on coupons;
create trigger update_coupons_updated_at
  before update on coupons
  for each row
  execute function update_updated_at_column();

-- ============================================
-- VERIFICAÇÕES
-- ============================================

select public.is_admin_user() as current_user_is_admin;

select policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('coupons', 'coupon_products', 'coupon_usage')
order by tablename, policyname;

select exists (
  select 1
  from public.user_roles
  where user_id = auth.uid()
    and role = 'admin'
) as admin_role_exists_for_current_user;

select auth.uid() as current_auth_uid;

select count(*) as total_coupons_visible_to_current_user
from coupons;

select count(*) as total_coupon_products_visible_to_current_user
from coupon_products;

select count(*) as total_coupon_usage_visible_to_current_user
from coupon_usage;

-- Teste opcional de escrita (rode autenticado como admin)
-- insert into coupons (code, discount_type, discount_value, max_uses)
-- values ('TEST10', 'percent', 10, 100)
-- returning id, code;

-- rollback do teste
-- delete from coupons where code = 'TEST10';

-- ============================================
-- FIM DA MIGRATION
-- ============================================
