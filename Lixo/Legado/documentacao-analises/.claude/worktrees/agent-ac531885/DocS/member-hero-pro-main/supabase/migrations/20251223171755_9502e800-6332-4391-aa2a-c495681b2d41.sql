-- Remove a constraint antiga
ALTER TABLE webhook_logs DROP CONSTRAINT IF EXISTS webhook_logs_status_check;

-- Cria nova constraint com todos os status necessários para Fase C
ALTER TABLE webhook_logs ADD CONSTRAINT webhook_logs_status_check 
  CHECK (status = ANY (ARRAY[
    'sucesso', 'erro', 'processando',
    'received', 'no_match', 'pending',
    'ignored',              -- evento não é compra aprovada
    'user_not_found',       -- aluno não cadastrado no sistema
    'already_enrolled'      -- matrícula já existe
  ]));