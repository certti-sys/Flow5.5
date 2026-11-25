-- Marcações (highlights) do aluno no leitor de PDF.
--
-- Espelha `member_lesson_pdf_annotations` da referência, com uma diferença de
-- chave: lá o escopo é (user, lesson, file_index) porque a aula pode ter vários
-- PDFs; aqui cada material é um arquivo só, então o escopo é (user, material) e
-- o `payload` guarda todos os highlights, com o número da página em cada um.
--
-- Coordenadas são normalizadas 0..1 sobre a página (independem do zoom e do
-- tamanho da tela) e as cores são fixas: yellow, green, pink.
--
-- Privado do aluno: nenhuma policy de leitura para admin - marcação é anotação
-- pessoal, não conteúdo da aula.

create table if not exists public.lesson_pdf_annotations (
    user_id uuid not null references auth.users(id) on delete cascade,
    material_id uuid not null references public.lesson_materials(id) on delete cascade,
    payload jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now(),
    primary key (user_id, material_id),
    -- Teto de 500 highlights por arquivo, igual à referência: payload maior que
    -- isso só existe se algo estiver errado no cliente.
    constraint lesson_pdf_annotations_payload_len check (
        jsonb_typeof(payload) = 'array' and jsonb_array_length(payload) <= 500
    )
);

alter table public.lesson_pdf_annotations enable row level security;

drop policy if exists "Users manage own pdf annotations" on public.lesson_pdf_annotations;
create policy "Users manage own pdf annotations" on public.lesson_pdf_annotations
    for all to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ============================================================================
-- Upsell / downsell: marcador de "já mostrei a oferta deste pedido"
-- ============================================================================

/**
 * Decide se a página de obrigado deve levar o cliente ao upsell.
 *
 * O token é o próprio `orderId` (UUID). Só vale uma vez por pedido pago: a
 * primeira chamada marca `metadata.upsell_shown` e devolve `true`; as seguintes
 * devolvem `false`. Sem isso, recarregar o obrigado reabriria a oferta para
 * sempre - e um upsell repetido é venda empurrada, não oferta.
 *
 * A condição de "há upsell" é a mesma de `normalizeUpsell` no front: ativo e com
 * pelo menos uma oferta. Sem isso, o obrigado não sai do lugar.
 */
create or replace function public.claim_order_upsell(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_order public.orders%rowtype;
    v_config jsonb;
    v_already boolean;
    v_show boolean;
begin
    select * into v_order from public.orders where id = p_order_id;
    if not found or v_order.status <> 'paid' then
        return false;
    end if;

    select nullif(pr.checkout_config, 'null'::jsonb) into v_config
      from public.order_items oi
      join public.products pr on pr.id = oi.product_id
     where oi.order_id = v_order.id and oi.kind = 'main'
     limit 1;

    -- Pedido de upsell não oferece outro upsell: senão vira corrente infinita.
    if coalesce(v_order.metadata->>'kind', '') <> '' then
        return false;
    end if;

    v_show := coalesce((v_config->'upsell'->>'enabled')::boolean, false)
              and jsonb_array_length(coalesce(v_config->'upsell'->'products', '[]'::jsonb)) > 0;
    v_already := coalesce((v_order.metadata->>'upsell_shown')::boolean, false);

    if not v_show or v_already then
        return false;
    end if;

    update public.orders
       set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('upsell_shown', true)
     where id = v_order.id;

    return true;
end;
$function$;

revoke execute on function public.claim_order_upsell(uuid) from public;
grant execute on function public.claim_order_upsell(uuid) to anon, authenticated;
