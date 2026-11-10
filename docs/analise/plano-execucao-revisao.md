# PLANO DE EXECUÇÃO — Revisão de Inputs Flow5.5

## Contexto
Sistema Flow5.5 (React 18 + Vite + Supabase). Banco já conectado no projeto `flow5` (ref `pbrdmjcpipuatbnkvekz`). Todas as 9 migrations aplicadas. RLS corrigido em 47 tabelas. Buckets de storage criados. Edge Functions deployadas. Conta admin `leandroaz@gmail.com` / `bidu57lex` funcional.

## Tarefas de Revisão (por domínio)

### Domínio 1: Autenticação (P0)
**T1.1** Login — verificar envio de email/senha, tratamento de erro 401, redirecionamento após sucesso
**T1.2** Cadastro (signup) — verificar criação de usuário, confirmação de email, redirect
**T1.3** Alterar senha — verificar validação de senha atual, nova senha, confirmação

### Domínio 2: Cursos e Conteúdo (P0)
**T2.1** Criar Curso — verificar todos os campos, upload de thumbnail, salvamento no banco
**T2.2** Editar Curso — verificar carregamento de dados existentes, atualização
**T2.3** Criar Módulo — verificar associação com curso, ordem
**T2.4** Criar Aula — verificar URL de vídeo, módulo, materiais
**T2.5** Criar Carrossel — verificar tipos (auto/manual), seleção de cursos

### Domínio 3: Alunos e Perfis (P0)
**T3.1** Criar Aluno — verificar criação via Edge Function create-user, perfil, role
**T3.2** Editar Aluno — verificar atualização de perfil
**T3.3** Suspender/Reativar Aluno — verificar mudança de status
**T3.4** Editar Perfil (próprio) — verificar atualização de dados, avatar
**T3.5** Atribuir Cursos — verificar associação aluno-curso, categorias

### Domínio 4: Comercial (P0)
**T4.1** Checkout — verificar fluxo completo, dados do cliente, pagamento
**T4.2** Criar Produto — verificar preço, tipo (one_time/subscription), concessão
**T4.3** Criar Cupom — verificar código, desconto, validade, produtos

### Domínio 5: Administração (P1)
**T5.1** Tema/Cores — verificar salvamento de configurações de tema
**T5.2** Email/WhatsApp Settings — verificar salvamento de credenciais
**T5.3** Gateways — verificar configuração de gateways de pagamento
**T5.4** Notificações — verificar envio/listagem
**T5.5** Comentários — verificar CRUD

### Domínio 6: Webhooks (P2)
**T6.1** Webhook Hub — verificar listagem, criação de receptores
**T6.2** Mapeamento de campos — verificar wizard de mapeamento
**T6.3** Schema de webhook — verificar visualização

## Critérios de Aceite por Tarefa
- [ ] Formulário carrega sem erros de console
- [ ] Validação Zod bloqueia envio com campos inválidos (toast de erro)
- [ ] Envio bem-sucedido retorna dados do banco
- [ ] Erro de rede/API mostra toast amigável
- [ ] Loading state funciona durante envio
- [ ] Formulário é resetado após sucesso
- [ ] RLS não bloqueia operação legítima (sem 403 inesperado)
