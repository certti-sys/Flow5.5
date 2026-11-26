-- Portal público de renovação (F5 do plano de assinaturas).
--
-- O token é gravado em subscriptions.metadata.renewal_url pelo aviso de
-- renovação. A RPC é SECURITY DEFINER com grant anon, mas expõe SÓ o estado
-- da assinatura cujo token foi informado — nunca lista, e-mails ou user_id.
-- URL de cobrança real entra quando F2 existir.

create or replace function public.get_renewal_info(p_token text)
returns table (product text, status text, period_end timestamptz)
language sql
stable
security definer
set search_path = public
as $function$
  select p.name, s.status, s.current_period_end
    from public.subscriptions s
    join public.products p on p.id = s.product_id
   where s.metadata->>'renewal_url' like '%' || p_token
     and p_token <> ''
   limit 1;
$function$;

revoke all on function public.get_renewal_info(text) from public;
grant execute on function public.get_renewal_info(text) to anon, authenticated;

notify pgrst, 'reload schema';
