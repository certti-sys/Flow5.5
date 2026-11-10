# Stack Tecnológica

Mapeamento das tecnologias e ferramentas utilizadas no **Neo Vidya Stream**.

## Core Development
- **Framework**: React 18 (Vite)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS + shadcn/ui
- **Estado**: React Query (TanStack Query) + LocalState
- **Roteamento**: React Router DOM v6

## Backend & Infra (Supabase)
- **Banco de Dados**: PostgreSQL
- **Autenticação**: Supabase Auth (JWT)
- **Functions**: Edge Functions (Deno Runtime)
- **Storage**: Supabase Storage (Avatares, Logos, Certificados)
- **Realtime**: PostgreSQL CDC para Rankings e Progresso

## Notificações e Comunicação
- **Email**: Brevo (SMTP/API v3)
- **WhatsApp**: Evolution API v2 (Instâncias dinâmicas)
- **Wrapper**: Templates Branded (HTML/CSS in-line)

## Integrações e Gateways
- **Checkout**: Mercado Pago SDK
- **Vídeos**: YouTube, Vimeo, Bunny.net, Panda Video, VTurb (via `UniversalPlayer`)
- **Webhooks**: Hub unificado para Kiwify, Hotmart e Gateways customizados

## Segurança Integrada
- **Headers**: CSP rigorosa, CORS (Edge Functions), XSS Protections
- **Database**: RLS (Row Level Security) em todas as tabelas críticas
- **Controle**: Rate Limiting por IP/Recipient em rotas sensíveis
