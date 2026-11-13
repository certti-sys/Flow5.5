-- Reenvio manual de entrega de webhook.
--
-- `webhook_deliveries` é somente leitura para o admin (a escrita é do service
-- role), senão o painel poderia forjar uma entrega "delivered". O botão de
-- reenviar, porém, precisa resetar a linha — então a escrita passa por esta
-- RPC, que valida o papel e só toca nas colunas de controle.
create or replace function public.requeue_webhook_delivery(p_delivery_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
begin
    if not public.has_role(auth.uid(), 'admin'::public.app_role) then
        raise exception 'forbidden' using errcode = '42501';
    end if;

    update public.webhook_deliveries
       set status = 'pending',
           attempt = 0,
           next_attempt_at = now(),
           error = null,
           response_status = null,
           response_body = null,
           delivered_at = null
     where id = p_delivery_id
       and status <> 'pending';

    return found;
end;
$function$;

revoke execute on function public.requeue_webhook_delivery(uuid) from public, anon;
grant execute on function public.requeue_webhook_delivery(uuid) to authenticated;
