# Projeto: Neo Vidya Stream (Flow 5.1)

## O que é este projeto?
O **Neo Vidya Stream** é uma plataforma educacional de streaming de cursos online, construída com uma stack moderna (**React 18 + TypeScript + Vite**) e backend serverless no **Supabase**. O sistema integra gestão de cursos, gamificação avançada, e-commerce com Mercado Pago e um hub de webhooks para integração com plataformas externas (Kiwify, Hotmart, etc).

## Valor Principal
Oferecer uma experiência de aprendizado "Premium" e automatizada, com foco em alta performance e escalabilidade.

## Requisitos de Negócio (Status Atual)
O sistema está funcional (~95%), mas requer **Saneamento de Segurança e Robustez Lógica** imediata para suportar operações de produção de forma segura.

## Requirements

### Validated (Existem no código)
- ✓ Autenticação via Supabase Auth
- ✓ Dashboard do Aluno com Carrosséis Dinâmicos
- ✓ Player de Vídeo Universal (YouTube, Vimeo, MP4)
- ✓ Sistema de Gamificação (XP, Badges, Streaks)
- ✓ Checkout Integrado com Mercado Pago
- ✓ Hub de Webhooks para Ingestão de Vendas
- ✓ Monitoramento de Saúde (`sys-health`)

### Active (Foco GSD Atual)
- [x] **Saneamento .env**: Remover credenciais do histórico do Git e regenerar chaves. (Concluído ✅)
- [x] **Rate Limiting**: Implementar proteção contra DoS e força bruta em APIs críticas via tabela `rate_limits`. (Concluído ✅)
- [x] **CORS Seguro**: Restringir acessos apenas a domínios permitidos (incluindo Localhost 8080). (Deploy Realizado ✅)
- [x] **Row Level Security (RLS)**: Garantir que usuários acessem apenas seus próprios dados no banco. (Concluído ✅)
- [ ] **Cookie Security**: Migrar tokens de sessão para `httpOnly` cookies. (Pendente)
- [x] **Logging Seguro**: Remover dados sensíveis (PII) dos logs de Edge Functions via utilitário `maskPII`. (Deploy Realizado ✅)
- [/] **Validação Robusta**: Implementar Zod em todos os endpoints de Edge Functions. (Em andamento)

### Out of Scope (Neste Marco)
- [ ] Modernização da Admin UI (Bento 2.0) — *Pausado para foco em estabilidade*
- [ ] Novas funcionalidades de Gamificação (Leaderboard Global)
- [ ] Integração com novos Gateways de Pagamento (Stripe/Asaas)

## Stack Tecnológica
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui.
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **Pagamentos**: Mercado Pago SDK.
- **Integrações**: Webhooks, Brevo (Email), WhatsApp (Meta/WAHA/Evolution).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Priority Shift | Segurança crítica detectada em auditoria anterior (`DocS/`). | SECURITY-FIRST |
| GSD Framework | Necessidade de controle rigoroso para não "quebrar" o projeto em andamento. | ATOMIC EXECUTION |

---
*Last updated: 2026-04-09 after Rate Limiting Implementation*
