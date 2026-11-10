# Deploy — Correção de CORS nas Edge Functions

**Data:** 2026-04-07  
**Responsável:** Claude Code  
**Status:** Arquivos locais atualizados — **aguardando deploy manual**

---

## Contexto

Durante auditoria de segurança (ref: `DocS/ANALISE_COMPLETA_SISTEMA.md`), foi identificada a vulnerabilidade **#5 — CORS permissivo (CVSS 8.2)**:

6 das 13 Edge Functions definiam seus próprios headers CORS locais com `Access-Control-Allow-Origin: '*'`, ignorando o helper compartilhado `_shared/cors.ts` que já possuía uma whitelist de origens permitidas.

---

## O que foi corrigido

### Arquivos modificados

| Arquivo | Tipo de alteração |
|---|---|
| `supabase/functions/check-achievements/index.ts` | Removido `corsHeaders` local, adicionado import + `getCorsHeaders()` |
| `supabase/functions/check-course-access/index.ts` | Reescrito (arquivo estava minificado) + `getCorsHeaders()` |
| `supabase/functions/lesson-progress/index.ts` | Removido `corsHeaders` local, adicionado import + `getCorsHeaders()` |
| `supabase/functions/payment-ops/index.ts` | Removido `corsHeaders` local, adicionado import + `getCorsHeaders()` |
| `supabase/functions/video-proxy/index.ts` | Removido `corsHeaders` local, adicionado import + `getCorsHeaders()` |
| `supabase/functions/webhooks-ingest/index.ts` | Reescrito (arquivo estava minificado) + `getCorsHeaders()` |
| `supabase/functions/_shared/cors.ts` | Removido export legado `corsHeaders` com `'*'` (não utilizado) |

### Padrão antes (vulnerável)

```ts
// Cada função definia seu próprio header local
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // qualquer origem
  'Access-Control-Allow-Headers': 'authorization, ...',
};
```

### Padrão depois (seguro)

```ts
// Importa o helper compartilhado com whitelist
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  // origin é validada contra a whitelist antes de responder
});
```

### Whitelist de origens permitidas (`_shared/cors.ts`)

```
https://neovidyastream.com
https://app.neovidyastream.com
https://admin.neovidyastream.com
http://localhost:3000
http://localhost:5173
http://localhost:5174
```

---

## Deploy necessário

As seguintes funções precisam ser deployadas no Supabase (`project-ref: nrcmksrtatvghxueatno`):

```bash
supabase functions deploy check-achievements --project-ref nrcmksrtatvghxueatno
supabase functions deploy check-course-access --project-ref nrcmksrtatvghxueatno
supabase functions deploy lesson-progress --project-ref nrcmksrtatvghxueatno
supabase functions deploy payment-ops --project-ref nrcmksrtatvghxueatno
supabase functions deploy video-proxy --project-ref nrcmksrtatvghxueatno
supabase functions deploy webhooks-ingest --project-ref nrcmksrtatvghxueatno
```

Ou todas de uma vez:

```bash
supabase functions deploy --project-ref nrcmksrtatvghxueatno
```

> **Nota:** O arquivo `_shared/cors.ts` não é uma função — é bundlado automaticamente junto com cada função no momento do deploy.

---

## Verificação pós-deploy

Após o deploy, confirmar que nenhuma função retorna `Access-Control-Allow-Origin: *`:

```bash
# Testar uma função (substituir pela URL real)
curl -I -X OPTIONS https://nrcmksrtatvghxueatno.supabase.co/functions/v1/payment-ops \
  -H "Origin: https://site-externo.com"

# Esperado: Access-Control-Allow-Origin: https://neovidyastream.com (não *)
# Ou ausência do header para origens não autorizadas
```

---

## Vulnerabilidades restantes (pós este deploy)

Este deploy resolve a **Vuln #5**. As seguintes ainda estão abertas:

| # | Vulnerabilidade | Status |
|---|---|---|
| 1 | Tokens JWT em localStorage | 🔴 Aberta |
| 2 | Rate limiting no login | 🟡 Parcial |
| 3 | RLS nas tabelas do banco | 🟡 Parcial |

Ref: `DocS/ANALISE_COMPLETA_SISTEMA.md` e `DocS/RELATORIO_SEGURANCA.txt`
