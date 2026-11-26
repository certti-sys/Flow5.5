-- Endpoint de teste para webhooks de saída (item 4 das pendências).
--
-- Hoje webhook_endpoints = 0 e webhook_deliveries = 0: o pipeline nunca foi
-- exercitado com destinatário real. Esta tabela registra o que a edge
-- webhook-test-receiver recebeu, permitindo homologar HMAC, bearer e entrega.
--
-- A edge lê secret e bearer_token do próprio endpoint (via service role),
-- então não precisa de secrets extras nem de valores versionados.

create table if not exists public.webhook_test_receipts (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null,
  event text,
  signature_valid boolean not null default false,
  bearer_ok boolean not null default false,
  received_at timestamptz not null default now(),
  body jsonb
);

alter table public.webhook_test_receipts enable row level security;

drop policy if exists "Admins read webhook test receipts" on public.webhook_test_receipts;
create policy "Admins read webhook test receipts" on public.webhook_test_receipts
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

grant select on public.webhook_test_receipts to authenticated;
