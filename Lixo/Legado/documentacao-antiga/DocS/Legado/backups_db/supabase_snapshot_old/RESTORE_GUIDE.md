# 🛡️ Guia de Restauração Flow 5.1

Este guia contém as instruções passo-a-passo para reconstruir seu ambiente Supabase do zero em caso de desastre ou migração de conta.

## 📁 Estrutura de Backup
Os arquivos necessários estão localizados na pasta `DocS/supabase/`:
- `schema.sql`: Estrutura do banco de dados (tabelas, tipos, RLS).
- `seed.sql`: Dados mestre (Cursos, Aulas, Configurações) e Alunos anonimizados.
- `functions/`: Código-fonte das 12 Edge Functions.
- `backup.ps1`: Script de automação para atualizações futuras.

---

## 🚀 Passo-a-passo de Restauração

### 1. Criar novo projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
2. Anote o `Project ID`, `SUPABASE_URL` e `SERVICE_ROLE_KEY`.

### 2. Restaurar Estrutura e Dados (SQL)
1. No painel do seu novo projeto, vá em **SQL Editor**.
2. Abra o arquivo `DocS/supabase/schema.sql`, copie e execute.
3. No mesmo editor, abra o arquivo `DocS/supabase/seed.sql`, copie e execute.
   - *Nota: Isso preencherá os cursos e configurações básicas.*

### 3. Configurar Edge Functions
Você deve realizar o deploy das funções na pasta `DocS/supabase/functions/`.

**Usando o Terminal (Recomendado):**
No diretório raiz do seu projeto local, execute:
```powershell
# Faça o login
npx supabase login

# Link o novo projeto
npx supabase link --project-ref SEU_NOVO_PROJECT_ID

# Deploy de todas as funções
npx supabase functions deploy
```

**Dica:** Se preferir deploy individual:
`npx supabase functions deploy check-course-access`

### 4. Configurar Variáveis de Ambiente (Secrets)
Para que as funções funcionem (Pagamentos, Emails, WhatsApp), você precisa configurar os Secrets no novo projeto:
```powershell
npx supabase secrets set STRIPE_SECRET_KEY=sua_chave_aqui
npx supabase secrets set MERCADO_PAGO_KEY=sua_chave_aqui
npx supabase secrets set EVOLUTION_API_KEY=sua_chave_aqui
# ... e demais chaves encontradas nas funções
```

### 5. Configurar Storage (Arquivos)
Certifique-se de recriar os Buckets no novo Supabase:
- `course-thumbnails` (Public)
- `avatars` (Public)
- `lesson-attachments` (Private)

---

## ⚡ Atualizando seu Backup
Para manter este backup sempre em dia com a produção, basta rodar o script no seu computador:
1. Abra o PowerShell na pasta raiz.
2. Execute: `.\DocS\supabase\backup.ps1`

---
> [!IMPORTANT]
> **Privacidade:** O `seed.sql` contém dados anonimizados. Para restaurar alunos reais, você deve exportar a lista de usuários via Dashboard do Supabase (Auth) separadamente, pois as senhas e metadados de autenticação são protegidos pelo sistema.
