-- Remove restrictive CHECK constraint on event_type to allow any event type from external platforms
ALTER TABLE public.webhook_transactions 
DROP CONSTRAINT IF EXISTS webhook_transactions_event_type_check;