-- F4 do plano de assinaturas: avisos de vencimento, renovação e confirmação.
--
-- get_subscription_reminders é SECURITY DEFINER e só service_role: a edge não
-- tem auth.uid(). O dedupe usa subscription_notifications (PK por dia+kind).
--
-- Janelas (configuráveis por produto em checkout_config.billing na F5; hoje
-- usa os defaults abaixo):
--   expiry_warning    -> current_period_end - 3 dias
--   renewal           -> current_period_end (D0)
--   renewal_confirmed -> current_period_end + 1 dia, só se renovada

create or replace function public.get_subscription_reminders(p_date date)
returns table (
  subscription_id uuid,
  user_id uuid,
  email text,
  user_name text,
  whatsapp text,
  product_name text,
  kind text,
  renewal_date text,
  days_left integer,
  renewal_url text
)
language sql
stable
security definer
set search_path = public
as $function$
  with dia as (
    select
      ((p_date + time '00:00') at time zone 'America/Sao_Paulo') as from_at,
      (((p_date + 1) + time '00:00') at time zone 'America/Sao_Paulo') as until_at
  ),
  base as (
    select s.id as subscription_id, s.user_id, s.status,
           s.current_period_end, s.metadata,
           u.email, coalesce(nullif(btrim(p.name), ''), 'Aluno') as user_name,
           p.name as product_name, pr.whatsapp,
           coalesce((s.metadata->>'notify_days_before')::int, 3) as notify_days
      from public.subscriptions s
      join auth.users u on u.id = s.user_id
      join public.profiles pr on pr.id = s.user_id
      left join public.products p on p.id = s.product_id
      where s.status in ('active', 'past_due', 'trialling')
  ),
  candidatos as (
    -- Aviso de vencimento: N dias antes
    select b.*, 'expiry_warning'::text as kind,
           (b.current_period_end at time zone 'America/Sao_Paulo')::date::text as renewal_date,
           b.notify_days as days_left
      from base b cross join dia d
     where b.current_period_end >= d.from_at + make_interval(days => b.notify_days)
       and b.current_period_end <  d.until_at + make_interval(days => b.notify_days)
    union all
    -- Lembrete de renovação: no dia do vencimento
    select b.*, 'renewal'::text as kind,
           (b.current_period_end at time zone 'America/Sao_Paulo')::date::text as renewal_date,
           0 as days_left
      from base b cross join dia d
     where b.current_period_end >= d.from_at
       and b.current_period_end <  d.until_at
    union all
    -- Confirmação: dia seguinte, só se a assinatura já renovou (periodo futuro)
    select b.*, 'renewal_confirmed'::text as kind,
           (b.current_period_end at time zone 'America/Sao_Paulo')::date::text as renewal_date,
           1 as days_left
      from base b cross join dia d
     -- Só confirma se o perfil RENOVOU: updated_at depois do fim do periodo
     -- anterior. Recem-criada (updated_at = created_at) nao dispara.
     where b.current_period_end > d.from_at
       and exists (
         select 1 from public.subscriptions s2
         where s2.id = b.subscription_id
           and s2.updated_at >  b.current_period_end
           and s2.updated_at >= d.from_at
           and s2.updated_at <  d.until_at
       )
  )
  select c.subscription_id, c.user_id, c.email, c.user_name, c.whatsapp,
         c.product_name, c.kind, c.renewal_date, c.days_left,
         coalesce(c.metadata->>'renewal_url', '') as renewal_url
    from candidatos c
   where not exists (
     select 1 from public.email_opt_outs eo
     where eo.email = lower(c.email)
   )
   and not exists (
     select 1 from public.subscription_notifications sn
     where sn.subscription_id = c.subscription_id
       and sn.kind = c.kind and sn.sent_on = p_date
   )
   and not public.has_role(c.user_id, 'admin'::public.app_role)
   order by c.kind, c.email;
$function$;

revoke all on function public.get_subscription_reminders(date) from public, anon, authenticated;
grant execute on function public.get_subscription_reminders(date) to service_role;

-- Templates de WhatsApp (3 novos; ON CONFLITO preserva edição do admin).
insert into public.message_templates (key, title, description, category, message) values
('subscription_expiry_warning', 'Assinatura a vencer', 'Lembrete antes do vencimento da assinatura', 'subscription',
'⏰ *Sua assinatura vence em {{days_left}} dias*

Olá, {{user_name}}! Sua assinatura de *{{product_name}}* vence em {{renewal_date}}.

Renove para não perder o acesso: {{renewal_url}}'),
('subscription_renewal', 'Renovação da assinatura', 'Lembrete no dia do vencimento', 'subscription',
'🔄 *Sua assinatura vence hoje*

{{user_name}}, a assinatura de *{{product_name}}* vence hoje ({{renewal_date}}).

Renove agora: {{renewal_url}}'),
('subscription_renewal_confirmed', 'Renovação confirmada', 'Confirmação após renovação aprovada', 'subscription',
'✅ *Assinatura renovada!*

{{user_name}}, sua assinatura de *{{product_name}}* foi renovada com sucesso até {{renewal_date}}.

Obrigado por continuar com a gente!')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
