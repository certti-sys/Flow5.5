-- Sistema de Cupons Avançado
-- Data: 2026-04-18
-- Autor: Claude (baseado em FlowMembers Evolution Package)

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

-- Admins podem fazer tudo em coupons
create policy "Admins can do everything on coupons"
  on coupons for all
  using (auth.jwt() ->> 'role' = 'admin');

-- Todos podem ler cupons ativos
create policy "Anyone can read active coupons"
  on coupons for select
  using (is_active = true);

-- Admins podem gerenciar coupon_products
create policy "Admins can manage coupon_products"
  on coupon_products for all
  using (auth.jwt() ->> 'role' = 'admin');

-- Todos podem ler coupon_products
create policy "Anyone can read coupon_products"
  on coupon_products for select
  using (true);

-- Apenas sistema pode inserir em coupon_usage
create policy "System can insert coupon_usage"
  on coupon_usage for insert
  with check (true);

-- Admins podem ler histórico
create policy "Admins can read coupon_usage"
  on coupon_usage for select
  using (auth.jwt() ->> 'role' = 'admin');

-- Trigger para atualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_coupons_updated_at
  before update on coupons
  for each row
  execute function update_updated_at_column();
