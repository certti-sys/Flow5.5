# Estrutura do Projeto

Mapeamento de diretórios e arquivos fundamentais do **Neo Vidya Stream**.

## 🎨 Frontend (`/src`)
- **`/components`**: UI Kit baseado em shadcn/ui.
- **`/hooks`**: Lógica reutilizável (`useGamification`, `useCourseAccess`, `usePlatformSettings`).
- **`/integrations`**: Configuração do cliente Supabase e instâncias de API.
- **`/pages`**: Componentes de rota (Dashboards, Perfil, Configurações Admin).
- **`/utils`**: Funções auxiliares de formatação e segurança.

## ⚡ Backend (`/supabase`)
- **`/functions`**: Edge Functions em Deno/TypeScript.
    - `check-achievements`: Motor de gamificação.
    - `send-email`: Disparador de e-mails branded.
    - `send-whatsapp`: Integrador Evolution API.
    - `retention-cron`: Serviço de retenção agendável.
    - `webhook-payment`: Processador de pagamentos.
- **`/migrations`**: Scripts SQL de evolução do banco de dados.

## 📝 Planejamento e Docs (`/.planning`)
- **`PROJECT.md`**: Definição e status do projeto.
- **`ROADMAP.md`**: Fases e cronograma de desenvolvimento.
- **`/codebase`**: Documentação técnica contínua (este diretório).

## 🔒 Segurança e Configuração (`root`)
- **`csp.json`**: Configuração centralizada de Content Security Policy.
- **`components.json`**: Configuração do shadcn/ui.
- **`tailwind.config.js`**: Design system tokens.
