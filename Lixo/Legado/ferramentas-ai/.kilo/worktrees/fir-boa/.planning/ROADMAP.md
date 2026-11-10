# Roadmap

## Próximo Marco: Estabilidade e Segurança Crítica (v5.1-Sec)
*Meta: Eliminar todas as 7 vulnerabilidades críticas e consolidar a lógica de APIs.*

### Phase 1: 🔴 Remediação Imediata (24-48h)
*Foco: Limpeza e vedação de vazamento de dados.*
- [x] **1.1 Saneamento de Logs**: Remover `console.log` de payloads sensíveis em todas as Edge Functions. (Deploy Realizado ✅)
- [x] **1.2 Proteção de Credenciais**: Remover `.env` do histórico do Git e reportar novas chaves necessárias. (Limpeza Realizada ✅)
- [x] **1.3 Whitelist de CORS**: Restringir origens em `supabase/functions/_shared/cors.ts`. (Deploy Realizado ✅)
- [ ] **1.4 Headers de Segurança**: Implementar CSP, HSTS e X-Frame-Options no front.

### Phase 2: 🟡 Proteção de Dados e Identidade (5-7 dias)
*Foco: Row Level Security e Sessões Seguras.*
- [ ] **2.1 Auditoria e SQL RLS**: Aplicar políticas de segurança em tabelas críticas (`orders`, `students`, `courses`).
- [ ] **2.2 Cookie Auth**: Migrar de `localStorage` para cookies `httpOnly` para evitar XSS.
- [ ] **2.3 Validação de Input**: Integrar Zod em 100% dos fluxos de ingestão de webhooks.

---

## Marcos Futuros (Backlog)

### 🟢 Milestone 2: Robustez Avançada
*Meta: Monitoramento e resiliência.*
- [ ] Phase 3: Logging Estruturado (Sentry/Log Sniffer).
- [ ] Phase 4: Implementação de 2FA (Two-Factor Authentication).
- [ ] Phase 5: Disaster Recovery Plan & Backups Automatizados.

### 🟣 Milestone 3: Modernização de Experiência
*Meta: Premium Admin UI & Performance.*
- [ ] Phase 6: Redesign Bento 2.0 do Painel Admin.
- [ ] Phase 7: Otimização de Performance de Dashboards.
- [ ] Phase 8: Advanced Gamification Leaderboards.

---
*Last updated: 2026-04-05 after GSD initialization*
