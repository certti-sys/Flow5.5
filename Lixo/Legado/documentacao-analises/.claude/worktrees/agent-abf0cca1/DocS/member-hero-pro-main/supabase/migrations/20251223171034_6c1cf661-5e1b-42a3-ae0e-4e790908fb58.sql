-- Remove a constraint antiga
ALTER TABLE webhook_logs DROP CONSTRAINT IF EXISTS webhook_logs_status_check;

-- Cria nova constraint com todos os status necessários
ALTER TABLE webhook_logs ADD CONSTRAINT webhook_logs_status_check 
  CHECK (status = ANY (ARRAY[
    'sucesso', 'erro', 'processando',
    'received', 'no_match', 'pending'
  ]));