-- Add name column to webhook_event_receivers for user-defined identification
-- This allows users to name receivers like "Hotmart - Produto X - Compra" for better organization

ALTER TABLE webhook_event_receivers 
ADD COLUMN IF NOT EXISTS name text;

-- Add comment for documentation
COMMENT ON COLUMN webhook_event_receivers.name IS 'Optional user-defined name for the receiver (e.g., "Hotmart - Curso Python - Compra")';
