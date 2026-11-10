-- Políticas RLS para tabela products
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
CREATE POLICY "Authenticated users can view products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
CREATE POLICY "Authenticated users can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update products" ON public.products;
CREATE POLICY "Users can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete products" ON public.products;
CREATE POLICY "Users can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
CREATE POLICY "Admins can manage all products"
ON public.products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);
