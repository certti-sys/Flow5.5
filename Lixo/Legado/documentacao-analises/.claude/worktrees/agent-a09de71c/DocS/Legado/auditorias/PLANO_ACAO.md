# 🎯 PLANO DE AÇÃO - NEO VIDYA STREAM

## 📌 PRÓXIMAS AÇÕES RECOMENDADAS

---

## ⚡ AÇÃO IMEDIATA (HOJE - Próximas 24h)

### 1. COMUNICAÇÃO COM O TIME ⚠️
```
Quem: Project Manager / Tech Lead
Quando: HOJE
Duração: 30 min
Ação:
  ✅ Chamar reunião de emergência
  ✅ Comunicar 7 vulnerabilidades críticas
  ✅ Distribuir RESUMO_EXECUTIVO.md
  ✅ Definir urgência de remediação
  ✅ Estabelecer timeline
```

**Matriz de Comunicação**:
- Executivos: RESUMO_EXECUTIVO.md (5 min, enfase: risco)
- Developers: GUIA_REMEDIACAO_SEGURANCA.md (30 min, ação)
- DevOps: GUIA_REMEDIACAO_SEGURANCA.md (20 min, implementação)
- Stakeholders: STATUS_GERAL (2 min, visão geral)

---

### 2. REGENERAR CREDENCIAIS 🔑
```
Quem: DevOps / Tech Lead
Quando: HOJE
Duração: 1-2 horas
Ação:
  ✅ Acessar console.supabase.com
  ✅ Regenerar todas as chaves Supabase
  ✅ Regenerar tokens Mercado Pago
  ✅ Armazenar em local seguro (KMS/Vault)
  ✅ Atualizar .env.local local
  ✅ NÃO fazer push do .env
```

**Procedimento Exato**:
Veja `GUIA_REMEDIACAO_SEGURANCA.md` - PASSO 2

---

### 3. REMOVER .env DO GIT 🧹
```
Quem: DevOps / Git Admin
Quando: HOJE (após regenerar credenciais)
Duração: 1-2 horas
Ação:
  ✅ Executar git filter-branch
  ✅ Force push com segurança
  ✅ Adicionar .env ao .gitignore
  ✅ Verificar remoção completa
  ✅ Auditar acessos históricos
```

**Procedimento Exato**:
Veja `GUIA_REMEDIACAO_SEGURANCA.md` - PASSO 1

---

### 4. AUDITORIA DE ACESSO 📋
```
Quem: Security / DevOps
Quando: HOJE
Duração: 1 hora
Ação:
  ✅ Revisar logs de acesso Supabase (últimos 30 dias)
  ✅ Verificar acessos suspeitos
  ✅ Revisar logs de pagamento (Mercado Pago)
  ✅ Revisar git log para quem viu .env
  ✅ Criar relatório de acesso
```

---

## 🔴 FASE 1: CRÍTICA (Próximas 48-72h)

### Timeline
```
Dia 1 (Hoje):     Comunicação + Regen Credenciais + Remover Git
Dia 2-3:          Implementar 5 correções críticas
Dia 3-4:          Testes + Deploy
```

### 5 Tarefas Críticas (Total: 4-6 horas)

#### 5.1 Rate Limiting 🛡️
```
Tempo: 1.5 horas
Implementador: Backend Developer
Arquivo: GUIA_REMEDIACAO_SEGURANCA.md - PASSO 3
Tarefas:
  1. Criar tabela rate_limits no Supabase (SQL)
  2. Implementar Edge Function login-handler
  3. Atualizar hook useAuth
  4. Testar com múltiplas tentativas
  5. Deploy e validação
```

**Verificação de Conclusão**:
```bash
# Testar rate limiting
curl -X POST http://localhost:3000/functions/v1/login-handler \
  -d '{"email":"test@example.com","password":"wrong"}' \
  -H "Content-Type: application/json"
# Fazer 5x - deve bloquear na 6ª
```

---

#### 5.2 CORS Seguro 🔐
```
Tempo: 45 minutos
Implementador: Backend Developer
Arquivo: GUIA_REMEDIACAO_SEGURANCA.md - PASSO 4
Tarefas:
  1. Editar supabase/functions/_shared/cors.ts
  2. Adicionar ALLOWED_ORIGINS whitelist
  3. Testar com curl de origens diferentes
  4. Deploy
```

**Verificação de Conclusão**:
```bash
# Deve rejeitar origem não permitida
curl -X GET http://localhost/api \
  -H "Origin: https://evil.com"
# Deve retornar vazio em Access-Control-Allow-Origin
```

---

#### 5.3 Remover Logs Sensíveis 📝
```
Tempo: 30 minutos
Implementador: Backend Developer
Arquivo: GUIA_REMEDIACAO_SEGURANCA.md - PASSO 5
Tarefas:
  1. Procurar todos console.log em supabase/functions/
  2. Remover ou substituir por logger seguro
  3. Revisar para dados sensíveis (CPF, cartão, token)
  4. Deploy
```

**Verificação de Conclusão**:
```bash
# Verificar sem console.log sensível
rg "console\.(log|error)" supabase/functions/ --type ts
# Não deve haver console.log(payload) ou console.log(headers)
```

---

#### 5.4 Headers de Segurança 🔒
```
Tempo: 1 hora
Implementador: Frontend Developer
Arquivo: GUIA_REMEDIACAO_SEGURANCA.md - PASSO 4
Tarefas:
  1. Adicionar CSP header
  2. Adicionar HSTS header
  3. Adicionar X-Frame-Options
  4. Testar com browser
  5. Deploy
```

**Verificação de Conclusão**:
```bash
curl -I https://neovidyastream.com
# Deve mostrar:
# Content-Security-Policy: default-src 'self'...
# Strict-Transport-Security: max-age=31536000
```

---

#### 5.5 Validação Zod em APIs ✅
```
Tempo: 1 hora
Implementador: Backend Developer
Tarefas:
  1. Criar schemas Zod para Edge Functions
  2. Adicionar validação em webhook-ingest
  3. Adicionar validação em payment-ops
  4. Testar com payloads inválidos
  5. Deploy
```

**Verificação de Conclusão**:
```bash
# Testar payload inválido
curl -X POST /functions/v1/webhooks-ingest \
  -d '{"invalid":"data"}'
# Deve retornar 400 Bad Request
```

---

### Checklist Fase 1
```
[ ] Comunicação do time realizada
[ ] Credenciais regeneradas
[ ] .env removido do Git
[ ] Rate limiting implementado e testado
[ ] CORS configurado com whitelist
[ ] Logs sensíveis removidos
[ ] Headers de segurança adicionados
[ ] Validação Zod em APIs implementada
[ ] Testes de segurança básicos passando
[ ] Deploy em staging realizado
[ ] Deploy em produção realizado
[ ] Rollback plan definido
```

**Tempo Total Fase 1**: 4-6 horas + 2-3h para testing/deploy = **6-9 horas**

---

## 🟡 FASE 2: IMPORTANTE (Próxima semana - 5-7 dias)

### Tasks Principais (Total: 12-16 horas)

#### 6. Row Level Security (RLS) 🔐
```
Tempo: 3 horas
Implementador: Backend Developer + DBA
Local: Supabase Console
Tarefas:
  1. Criar RLS policy para cursos
  2. Criar RLS policy para ordens
  3. Criar RLS policy para pagamentos
  4. Testes end-to-end
  5. Deploy com validação

SQL Exemplo:
  CREATE POLICY "student_course_access" ON courses
    FOR SELECT
    USING (
      auth.uid() IN (SELECT user_id FROM user_course_access 
                     WHERE course_id = courses.id)
      OR auth.jwt() ->> 'role' = 'admin'
    );
```

---

#### 7. HttpOnly Cookies 🍪
```
Tempo: 4 horas
Implementador: Frontend + Backend Developer
Tarefas:
  1. Implementar refresh token flow
  2. Migrar de localStorage para httpOnly
  3. Atualizar Auth context
  4. Testes de persistência de sessão
  5. Deploy gradual (canary)
```

---

#### 8. CSP Headers Completos 📋
```
Tempo: 1 hora
Implementador: DevOps / Frontend
Tarefas:
  1. Definir policy restritiva
  2. Testar em staging
  3. Monitorar erros
  4. Ajustar policies necessárias
  5. Deploy
```

---

#### 9. Validação de Permissões em APIs ✔️
```
Tempo: 2 horas
Implementador: Backend Developer
Tarefas:
  1. Revisar todas as Edge Functions
  2. Adicionar checks de autorização
  3. Validar user_id vs request user
  4. Testes de bypass
  5. Deploy
```

---

#### 10. Testes de Segurança 🧪
```
Tempo: 2-3 horas
Implementador: QA / Security
Tarefas:
  1. Executar npm audit
  2. Escanear com OWASP ZAP
  3. Testes de XSS
  4. Testes de CSRF
  5. Testes de SQL Injection
  6. Documentar resultados
```

---

### Checklist Fase 2
```
[ ] RLS implementado em todas as tabelas críticas
[ ] HttpOnly cookies funcional
[ ] Refresh token flow funcionando
[ ] CSP header restritivo
[ ] Validação de permissões em APIs
[ ] Testes de segurança passando
[ ] Documentação atualizada
[ ] Deploy em staging validado
[ ] Deploy em produção realizado
```

**Tempo Total Fase 2**: 12-16 horas + 2-3h testing/deploy = **14-19 horas**

---

## 🟢 FASE 3: DESEJÁVEL (2-3 semanas)

### Tasks Bonus (Total: 16-24 horas)

```
[ ] Autenticação 2FA (TOTP)              → 4 horas
[ ] Logging estruturado (Sentry)         → 3 horas
[ ] Alertas de segurança                 → 2 horas
[ ] Testes OWASP ZAP automatizados       → 3 horas
[ ] Documentação SECURITY.md             → 1 hora
[ ] Disaster recovery plan               → 3-8 horas
```

---

## 📊 ROADMAP VISUAL

```
HOJE
  ├─ [🔴] Comunicar vulnerabilidades
  ├─ [🔴] Regenerar credenciais
  ├─ [🔴] Remover .env do Git
  └─ [🔴] Auditoria de acesso

AMANHÃ-DIA 3 (FASE 1: 6-9 horas)
  ├─ [🟡] Rate limiting
  ├─ [🟡] CORS whitelist
  ├─ [🟡] Remove logs sensíveis
  ├─ [🟡] Headers de segurança
  ├─ [🟡] Validação Zod
  └─ [🟢] Testes + Deploy

SEMANA QUE VEM (FASE 2: 14-19 horas)
  ├─ [🔵] RLS no Supabase
  ├─ [🔵] HttpOnly cookies
  ├─ [🔵] CSP headers
  ├─ [🔵] Autorização em APIs
  └─ [🔵] Testes completos

2-3 SEMANAS (FASE 3: 16-24 horas)
  ├─ [💚] 2FA
  ├─ [💚] Logging estruturado
  ├─ [💚] Alertas
  ├─ [💚] OWASP ZAP
  ├─ [💚] Documentação
  └─ [💚] Disaster recovery
```

---

## 👥 ALOCAÇÃO DE RECURSOS

### Recomendado

```
Backend Developer:      60% (RLS, APIs, rate limiting)
Frontend Developer:     20% (httpOnly cookies, testes)
DevOps/Security:        15% (deploys, headers, CORS)
QA/Tester:              5% (testes de segurança)
```

### Por Dia

```
Dia 1:   All hands on deck (comunicação + setup)
Dia 2-3: 1-2 devs (implementação Fase 1)
Dia 4-7: 1-2 devs (implementação Fase 2)
Dia 8+:  1 dev (manutenção + Fase 3)
```

---

## 📞 ESCALAÇÃO E CONTATO

### Se encontrar problemas:

**Problema**: Erro ao regenerar credenciais  
**Solução**: Contatar Supabase Support  
**Escalação**: CTO / Tech Lead  
**Tempo**: 2 horas máximo

**Problema**: Deploy quebrou produção  
**Solução**: Executar rollback (prepare branch anterior)  
**Escalação**: DevOps + CTO  
**Tempo**: 30 min máximo

**Problema**: Testes de segurança falhando  
**Solução**: Revisar GUIA_REMEDIACAO_SEGURANCA.md  
**Escalação**: Security specialist  
**Tempo**: Até 4 horas

---

## 📈 MÉTRICAS DE SUCESSO

### Fase 1 (24-48h)
```
✅ Score Segurança: 25% → 50%
✅ Vulnerabilidades Críticas: 7 → 2
✅ Testes de Segurança: 0% → 70% pass
```

### Fase 2 (1-2 semanas)
```
✅ Score Segurança: 50% → 80%
✅ Vulnerabilidades Críticas: 2 → 0
✅ Testes de Segurança: 70% → 95% pass
```

### Fase 3 (2-3 semanas)
```
✅ Score Segurança: 80% → 95%
✅ Compliance: LGPD/GDPR básico
✅ Testes de Segurança: 100% pass
```

---

## 🎓 DOCUMENTAÇÃO PARA ESTUDO

### Para Backend Developers
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Rate Limiting Best Practices](https://www.cloudflare.com/learning/bbb/what-is-rate-limiting/)

### Para Frontend Developers
- [React Security](https://react.dev/learn#security-warnings)
- [CSRF Protection](https://owasp.org/www-community/attacks/csrf)
- [HttpOnly Cookies](https://owasp.org/www-community/HttpOnly)

### Para DevOps
- [CSP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HSTS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [Nginx Security](https://nginx.org/en/docs/http/ngx_http_core_module.html#server_tokens)

---

## ✅ ASSINATURA DE CONFIRMAÇÃO

Para garantir execução:

```
[ ] Aceito o plano de ação
[ ] Aloco recursos necessários
[ ] Recomendo timeline (HOJE início)
[ ] Designo responsáveis por cada fase
[ ] Estabeleço marcos de conclusão
[ ] Agendo reuniões de checkpoint

Assinado: _________________ Data: _______
```

---

## 📞 PRÓXIMO PASSO

**Agora**: Leia `RESUMO_EXECUTIVO.md` + `GUIA_REMEDIACAO_SEGURANCA.md`

**Em 1 hora**: Chamar reunião com o time

**Em 24h**: Iniciar Fase 1 (remediação crítica)

---

**Status**: 🔴 **REQUER AÇÃO IMEDIATA**  
**Urgência**: 🔴 **CRÍTICA**  
**Tempo Disponível**: 48 horas antes de risco severo
