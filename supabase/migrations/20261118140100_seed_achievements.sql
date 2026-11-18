-- Seed das conquistas.
--
-- A tabela `achievements` está vazia em produção: o código de desbloqueio
-- (`check-achievements`) existe, a galeria no perfil existe, mas não há nenhuma
-- conquista para desbloquear. Nada acontece ao concluir aula nenhuma.
--
-- Critérios usados são exatamente os três que a edge function implementa hoje
-- (`lessons_completed`, `streak_days`, `daily_lessons`). Critério que a function
-- não conhece seria uma conquista impossível de ganhar.
--
-- Idempotente por `title`: rodar de novo não duplica.

insert into public.achievements (title, description, icon, criteria_type, criteria_value, xp_reward, order_index)
select v.title, v.description, v.icon, v.criteria_type, v.criteria_value, v.xp_reward, v.order_index
from (values
    ('Primeira Aula',      'Concluiu a primeira aula da plataforma.',            '🎯', 'lessons_completed',  1,  20,  1),
    ('Cinco Aulas',        'Concluiu cinco aulas.',                              '📚', 'lessons_completed',  5,  50,  2),
    ('Dez Aulas',          'Concluiu dez aulas.',                                '🔥', 'lessons_completed', 10,  80,  3),
    ('Vinte e Cinco Aulas','Concluiu vinte e cinco aulas.',                      '🚀', 'lessons_completed', 25, 150,  4),
    ('Cinquenta Aulas',    'Concluiu cinquenta aulas.',                          '💎', 'lessons_completed', 50, 300,  5),
    ('Constância',         'Manteve uma sequência de 3 dias seguidos.',          '📅', 'streak_days',        3,  50,  6),
    ('Disciplina',         'Manteve uma sequência de 7 dias seguidos.',          '🗓️', 'streak_days',        7, 100,  7),
    ('Maratonista',        'Manteve uma sequência de 30 dias seguidos.',         '🏆', 'streak_days',       30, 400,  8),
    ('Estudo Intenso',     'Concluiu 3 aulas no mesmo dia.',                     '⚡', 'daily_lessons',      3,  40,  9),
    ('Dia Dedicado',       'Concluiu 5 aulas no mesmo dia.',                     '🌟', 'daily_lessons',      5,  90, 10)
) as v(title, description, icon, criteria_type, criteria_value, xp_reward, order_index)
where not exists (
    select 1 from public.achievements a where a.title = v.title
);
