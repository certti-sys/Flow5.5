-- Ordenação manual de cursos (drag & drop na Gestão de Cursos).
-- `modules` e `lessons` já tinham order_index; só `courses` não tinha, então a
-- lista era ordenada por created_at e não havia como o admin reordenar.

alter table courses add column if not exists order_index integer not null default 0;

-- Backfill preservando a ordem que o admin já via (mais recentes primeiro).
with ranked as (
  select id, row_number() over (order by created_at desc, id) - 1 as pos
  from courses
)
update courses c
set order_index = ranked.pos
from ranked
where c.id = ranked.id;

create index if not exists idx_courses_order on courses (order_index);
