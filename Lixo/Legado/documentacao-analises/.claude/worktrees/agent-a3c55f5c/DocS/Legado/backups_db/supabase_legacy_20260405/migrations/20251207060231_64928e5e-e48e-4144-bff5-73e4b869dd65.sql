-- Permitir admins deletarem transações de webhook
CREATE POLICY "Admins can delete webhook_transactions"
ON public.webhook_transactions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));