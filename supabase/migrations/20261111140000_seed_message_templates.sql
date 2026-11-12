-- Templates padrão de WhatsApp.
-- A baseline (20260405000000) criou a tabela mas não trouxe os seeds do banco
-- legado, então /admin/whatsapp abria com a lista vazia.
-- ON CONFLICT preserva qualquer texto que o admin já tenha editado.

INSERT INTO public.message_templates (key, title, description, category, message) VALUES
('welcome_new_user', 'Boas-vindas', 'Enviada quando um novo aluno é cadastrado', 'welcome',
'🎉 *Bem-vindo(a), {{user_name}}!*

Sua conta na plataforma foi criada.

*Email:* {{user_email}}
*Senha:* {{temp_password}}

Acesse {{login_url}} e troque a senha no primeiro login.'),

('course_access_granted', 'Acesso ao Curso', 'Enviada quando o aluno recebe acesso a um curso', 'notification',
'📚 *Novo curso liberado!*

Olá, {{user_name}}! Você agora tem acesso ao curso *{{course_name}}*.

Comece agora: {{login_url}}'),

('lesson_reminder', 'Lembrete de Aula', 'Enviada como lembrete de aula', 'notification',
'⏰ *Não esqueça da sua aula!*

{{user_name}}, a aula *{{lesson_name}}* do curso *{{course_name}}* está esperando por você.

Continuar: {{login_url}}'),

('payment_confirmed', 'Pagamento Confirmado', 'Enviada quando o pagamento é aprovado', 'payment',
'✅ *Pagamento confirmado!*

Olá, {{customer_name}}! Seu pagamento de *R$ {{amount}}* foi aprovado e o acesso ao curso *{{course_name}}* já está liberado.

Acesse: {{login_url}}'),

('new_order_admin', 'Nova Venda - Admin', 'Enviada ao administrador quando entra uma nova venda', 'admin',
'💰 *Nova venda!*

Cliente: {{customer_name}}
Email: {{customer_email}}
Curso: {{course_name}}
Valor: *R$ {{amount}}*'),

('achievement_unlocked', 'Conquista Desbloqueada', 'Enviada quando o aluno desbloqueia uma conquista', 'gamification',
'🏆 *Conquista desbloqueada!*

{{user_name}}, você ganhou a medalha *{{medalha}}* — {{descricao_medalha}} e *+{{xp_medalha}} XP*.'),
('level_up', 'Novo Nível', 'Enviada quando o aluno sobe de nível', 'gamification',
'🚀 *Você subiu de nível!*

{{user_name}}, você alcançou o nível *{{level}}* com *{{xp}} XP* acumulados. Continue assim!'),

('streak_at_risk', 'Ofensiva em Risco', 'Enviada quando o aluno está prestes a perder a ofensiva', 'gamification',
'🔥 *Sua ofensiva de {{dias_ofensiva}} dias está em risco!*

{{user_name}}, você ainda não estudou hoje. Faça uma aula rapidinho para não perder sua sequência.

{{login_url}}')
ON CONFLICT (key) DO NOTHING;
