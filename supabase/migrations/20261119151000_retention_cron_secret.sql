-- Registra a URL do cron de retenção no vault.
--
-- O `trigger_retention_cron()` sai de fábrica sem efeito quando o segredo não
-- existe (mesmo desenho dos outros drenadores). Sem esta linha o job diário
-- criado em `20261119150000` rodaria sem fazer nada.

do $$
begin
    if not exists (select 1 from vault.secrets where name = 'retention_cron_dispatch_url') then
        perform vault.create_secret(
            'https://pbrdmjcpipuatbnkvekz.supabase.co/functions/v1/retention-cron',
            'retention_cron_dispatch_url',
            'Cron diário do aviso de streak em risco'
        );
    end if;
end;
$$;
