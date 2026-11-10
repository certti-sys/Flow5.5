-- Políticas RLS para tabela coupons
DROP POLICY IF EXISTS "Authenticated users can view coupons" ON public.coupons;
CREATE POLICY "Authenticated users can view coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert coupons" ON public.coupons;
CREATE POLICY "Authenticated users can insert coupons"
ON public.coupons
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update coupons" ON public.coupons;
CREATE POLICY "Users can update coupons"
ON public.coupons
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete coupons" ON public.coupons;
CREATE POLICY "Users can delete coupons"
ON public.coupons
FOR DELETE
TO authenticated
USING (true);

-- Políticas RLS para tabela coupon_products
DROP POLICY IF EXISTS "Authenticated users can view coupon_products" ON public.coupon_products;
CREATE POLICY "Authenticated users can view coupon_products"
ON public.coupon_products
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert coupon_products" ON public.coupon_products;
CREATE POLICY "Authenticated users can insert coupon_products"
ON public.coupon_products
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update coupon_products" ON public.coupon_products;
CREATE POLICY "Users can update coupon_products"
ON public.coupon_products
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete coupon_products" ON public.coupon_products;
CREATE POLICY "Users can delete coupon_products"
ON public.coupon_products
FOR DELETE
TO authenticated
USING (true);

-- Políticas RLS para tabela coupon_usage
DROP POLICY IF EXISTS "Authenticated users can view coupon_usage" ON public.coupon_usage;
CREATE POLICY "Authenticated users can view coupon_usage"
ON public.coupon_usage
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert coupon_usage" ON public.coupon_usage;
CREATE POLICY "Authenticated users can insert coupon_usage"
ON public.coupon_usage
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update coupon_usage" ON public.coupon_usage;
CREATE POLICY "Users can update coupon_usage"
ON public.coupon_usage
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete coupon_usage" ON public.coupon_usage;
CREATE POLICY "Users can delete coupon_usage"
ON public.coupon_usage
FOR DELETE
TO authenticated
USING (true);
