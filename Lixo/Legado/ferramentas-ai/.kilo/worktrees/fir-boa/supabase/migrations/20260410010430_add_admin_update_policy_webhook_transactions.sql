-- Adicionar política de UPDATE para admins na tabela webhook_transactions
-- Necessário para o Auto-Heal do DataHealthPanel poder corrigir user_id órfãos
CREATE POLICY "Admins can update webhook_transactions"
ON public.webhook_transactions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
