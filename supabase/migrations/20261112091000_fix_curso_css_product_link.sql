-- `Curso CSS` era o único produto sem `course_id` e sem `category`: comprador
-- pagava e não recebia nada. Cria o curso correspondente e vincula.

insert into public.courses (id, title, thumbnail, category, instructor, duration, description, order_index)
values (
    '550e8400-e29b-41d4-a716-446655440004',
    'CSS Moderno',
    -- Reaproveita um thumbnail existente: `courses.thumbnail` é NOT NULL e não
    -- há imagem própria para este curso ainda.
    (select thumbnail from public.courses where id = '550e8400-e29b-41d4-a716-446655440001'),
    'Desenvolvimento Web',
    'João Silva',
    '6h',
    'Layouts modernos com Flexbox, Grid e variáveis CSS.',
    3
)
on conflict (id) do update
set category = excluded.category,
    order_index = excluded.order_index;

insert into public.modules (id, course_id, title, order_index)
values ('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440004', 'Fundamentos de CSS', 0)
on conflict (id) do nothing;

update public.products
set course_id = '550e8400-e29b-41d4-a716-446655440004',
    category = null
where checkout_slug = 'curso-css';
