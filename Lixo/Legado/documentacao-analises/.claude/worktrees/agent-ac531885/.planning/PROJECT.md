# Projeto: Neo Vidya Stream (Flow 5.1)

## O que é este projeto?
O **Neo Vidya Stream** é uma plataforma educacional de streaming de cursos online, construída com uma stack moderna (**React 18 + TypeScript + Vite**) e backend serverless no **Supabase**. O sistema integra gestão de cursos, gamificação avançada, e-commerce com Mercado Pago e um hub de webhooks para integração com plataformas externas (Kiwify, Hotmart, etc).

## Valor Principal
Oferecer uma experiência de aprendizado "Premium" e automatizada, com foco em alta performance e escalabilidade.

## Requisitos de Negócio (Status Atual)
O sistema está funcional (~99%) e devidamente **Protegido e Saneado**. O sistema de **Gamificação e Retenção** foi plenamente integrado ao perfil do aluno, garantindo uma experiência coesa e sem redundâncias.

## Requirements

### Validated (Existem no código)
- ✓ Autenticação via Supabase Auth
- ✓ Dashboard do Aluno com Carrosséis Dinâmicos
- ✓ Player de Vídeo Universal (YouTube, Vimeo, MP4, Bunny, Panda, VTurb)
- ✓ Sistema de Gamificação (XP Engine, Badges, Streaks) - HARDENED & INTEGRATED
- ✓ Leaderboards Dinâmicos (Semanal, Mensal, Global)
- ✓ Checkout Integrado com Mercado Pago
- ✓ Hub de Webhooks para Ingestão de Vendas
- ✓ Monitoramento de Saúde (`sys-health`)
- ✓ Sistema de Certificados Digitais (Templates dinâmicos, PDF)
- ✓ **Gamificação & Retenção**: Notificações automáticas via Email/WhatsApp integradas.
- ✓ **Segurança**: CSP, CORS, RLS, Rate Limiting e Cookies Seguros implementados.

### Active (Foco GSD Atual)
- [ ] **Active Milestone:** Milestone 2: Engagement & Infrastructure
**Current Focus:** Phase 7: Landing Page & Marketing
**Status:** Phase 6 Completed (Monitoring & Resilience Deployed) + UI/UX Reorg Concluded.
- [ ] Novas funcionalidades de Gamificação (Leaderboard Global)
- [ ] Integração com novos Gateways de Pagamento (Stripe/Asaas)
- [ ] **Phase 8: Business Intelligence & AI** (IA Tutor & Smart Recommendations)

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
*Last updated: 2026-04-13 after Phase 6 & Sidebar Reorg*
