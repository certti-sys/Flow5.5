-- Recuperação de carrinho: textos por estágio e canal SMS.
--
-- Até aqui os textos viviam hardcoded na edge `cart-recovery` e o admin só
-- escolhia o intervalo entre contatos. Os textos passam a ficar no banco, no
-- mesmo lugar da configuração do funil (uma linha só, `id = true`).
--
-- `templates` é indexado pelo estágio (0 = primeiro contato):
--   { "email":    [{ "subject": "...", "body": "..." }],
--     "whatsapp": [{ "body": "..." }],
--     "sms":      [{ "body": "..." }] }
-- Campo vazio/ausente = texto padrão da edge. Assim quem nunca abriu a tela
-- continua com o texto de antes, sem precisar de seed.
--
-- `channel_sms` entra desligado: SMS custa por mensagem e só funciona com a
-- integração IntegraX ativa.

alter table public.cart_recovery_settings
    add column if not exists channel_sms boolean not null default false,
    add column if not exists templates jsonb not null default '{}'::jsonb;

comment on column public.cart_recovery_settings.templates is
    'Textos por estágio e canal do funil de carrinho abandonado. Vazio = padrão da edge cart-recovery.';
comment on column public.cart_recovery_settings.channel_sms is
    'Terceiro canal do funil. Envia pela integração IntegraX (máx. 160 caracteres).';
