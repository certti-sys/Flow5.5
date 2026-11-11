-- Checkout público: a rota /checkout/:productId não exige login, mas products e
-- order_bumps só tinham SELECT para `authenticated`. Um visitante anônimo recebia
-- [] e a página mostrava "Produto não encontrado" — pagamento impossível sem conta.
--
-- Escopo mínimo: só as linhas que o checkout realmente oferece (active / is_active).
-- Nada de INSERT/UPDATE/DELETE para anon e nenhuma coluna nova exposta.

CREATE POLICY "Anyone can read active products"
  ON public.products
  FOR SELECT
  TO anon
  USING (active = true);

CREATE POLICY "Anyone can read active order bumps"
  ON public.order_bumps
  FOR SELECT
  TO anon
  USING (is_active = true);
