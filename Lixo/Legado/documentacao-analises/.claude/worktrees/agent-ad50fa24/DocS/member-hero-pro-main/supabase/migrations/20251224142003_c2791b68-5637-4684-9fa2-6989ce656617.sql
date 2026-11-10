-- Drop existing constraint
ALTER TABLE webhook_logs 
DROP CONSTRAINT IF EXISTS webhook_logs_status_check;

-- Add new constraint with user_created included
ALTER TABLE webhook_logs 
ADD CONSTRAINT webhook_logs_status_check 
CHECK (status IN ('sucesso', 'user_created', 'ignored', 'no_match', 'user_not_found', 'already_enrolled', 'erro', 'pending', 'processed', 'failed'));