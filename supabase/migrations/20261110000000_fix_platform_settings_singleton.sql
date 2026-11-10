-- Consolida platform_settings em um único registro ativo.
--
-- Contexto: a tabela passou a ter vários registros ativos. A query do app usava
-- .maybeSingle(), que retorna erro quando há mais de uma linha; com isso os
-- settings caíam no default (navigation_layout = 'horizontal') e o layout
-- "voltava sozinho". Além disso, com settings nulo, cada save inseria uma nova
-- linha, multiplicando as duplicatas.
--
-- Mantemos o registro mais antigo, que é o canônico e contém os dados de
-- branding/banner salvos anteriormente, e removemos as duplicatas.

DELETE FROM public.platform_settings
WHERE is_active = true
  AND id <> (
    SELECT id
    FROM public.platform_settings
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1
  );

-- Impede que novas duplicatas ativas sejam criadas.
CREATE UNIQUE INDEX IF NOT EXISTS platform_settings_single_active_idx
  ON public.platform_settings ((is_active))
  WHERE is_active = true;
