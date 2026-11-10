# Guia de Configuração do Supabase

Este guia explica como conectar sua aplicação a um projeto Supabase externo.

## Passo 1: Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie uma conta ou faça login
3. Clique em "New Project"
4. Preencha os dados:
   - Nome do projeto
   - Senha do banco de dados (guarde com segurança!)
   - Região (escolha a mais próxima dos seus usuários)
5. Aguarde a criação do projeto (leva cerca de 2 minutos)

## Passo 2: Obter Credenciais

1. No painel do projeto, vá em **Settings** (ícone de engrenagem)
2. Clique em **API**
3. Copie os seguintes valores:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public** key (a chave pública, não a service_role!)

## Passo 3: Configurar Variáveis de Ambiente

1. Na raiz do projeto, crie um arquivo chamado `.env` (copie o `.env.example`)
2. Adicione suas credenciais:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

⚠️ **IMPORTANTE**: Nunca commite o arquivo `.env` no Git! Ele já está no `.gitignore`.

## Passo 4: Executar as Migrations

Você tem duas opções para criar as tabelas no banco de dados:

### Opção A: SQL Editor no Supabase (Mais Fácil)

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **New query**
3. Copie todo o conteúdo do arquivo `supabase/migrations/20240101000000_initial_schema.sql`
4. Cole no editor e clique em **Run**
5. Aguarde a execução (pode levar alguns segundos)
6. Verifique se não há erros

### Opção B: Supabase CLI (Requer instalação)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Fazer login
supabase login

# Linkar ao projeto
supabase link --project-ref seu-project-ref

# Executar migrations
supabase db push
```

## Passo 5: Verificar Tabelas Criadas

1. No painel do Supabase, vá em **Table Editor**
2. Você deve ver as seguintes tabelas:
   - `profiles`
   - `user_roles`
   - `courses`
   - `modules`
   - `lessons`
   - `user_progress`
   - `comments`

## Passo 6: Configurar Authentication

1. No painel do Supabase, vá em **Authentication** > **Providers**
2. Ative o provider **Email**
3. Em **Authentication** > **URL Configuration**:
   - **Site URL**: Cole a URL da sua aplicação (ex: `https://seu-app.lovable.app`)
   - **Redirect URLs**: Adicione:
     - `https://seu-app.lovable.app/**`
     - `http://localhost:8080/**` (para desenvolvimento)

## Passo 7: Criar Primeiro Usuário Admin

1. Vá em **SQL Editor** no Supabase
2. Execute o seguinte SQL para criar um usuário admin:

```sql
-- Primeiro, crie o usuário via Authentication > Users no painel
-- Depois, pegue o UUID do usuário e execute:

INSERT INTO public.user_roles (user_id, role)
VALUES ('uuid-do-usuario-aqui', 'admin');
```

Ou crie via interface:
1. **Authentication** > **Users** > **Add user**
2. Preencha email e senha
3. Copie o UUID do usuário criado
4. Execute o SQL acima com o UUID

## Passo 8: Instalar Dependência do Supabase

Execute o comando para instalar o cliente Supabase:

```bash
npm install @supabase/supabase-js
```

## Passo 9: Testar a Conexão

1. Reinicie o servidor de desenvolvimento
2. Acesse a aplicação
3. Tente fazer login com o usuário criado
4. Verifique se os dados são carregados

## Estrutura do Banco de Dados

### Tabelas Principais

- **profiles**: Perfis dos usuários (nome, email, whatsapp, avatar)
- **user_roles**: Papéis dos usuários (admin, moderator, user) - SEPARADA para segurança
- **courses**: Cursos disponíveis
- **modules**: Módulos dos cursos
- **lessons**: Aulas dos módulos
- **user_progress**: Progresso dos usuários nas aulas
- **comments**: Comentários nas aulas

### Segurança (RLS)

Todas as tabelas possuem Row Level Security (RLS) ativado:
- Usuários podem ver apenas seus próprios dados
- Admins têm acesso completo
- Cursos, módulos e aulas são visíveis para todos autenticados
- Progresso e comentários são privados por usuário

### Função de Verificação de Role

A função `has_role(user_id, role)` verifica se um usuário tem determinado papel.
É usada nas políticas RLS para controle de acesso seguro.

## Troubleshooting

### Erro: "Missing Supabase environment variables"
- Verifique se o arquivo `.env` existe na raiz do projeto
- Confirme se as variáveis estão corretas
- Reinicie o servidor de desenvolvimento

### Erro: "requested path is invalid" ao fazer login
- Configure o Site URL e Redirect URLs nas configurações de autenticação
- Use a URL exata da sua aplicação

### Não consigo ver os dados
- Verifique se as políticas RLS estão corretas
- Confirme se o usuário está autenticado
- Verifique se o usuário tem as permissões necessárias

### Erro de CORS
- Adicione sua URL nas Redirect URLs permitidas
- Verifique se está usando HTTPS (exceto localhost)

## Próximos Passos

Após a configuração, você precisará:
1. Migrar os dados mockados para o banco (opcional)
2. Atualizar os componentes para usar dados reais do Supabase
3. Implementar autenticação real nas páginas
4. Testar todas as funcionalidades

## Suporte

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
