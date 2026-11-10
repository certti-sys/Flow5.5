-- Remove restrictive CHECK constraint on status to allow any status value
ALTER TABLE public.webhook_transactions 
DROP CONSTRAINT IF EXISTS webhook_transactions_status_check;