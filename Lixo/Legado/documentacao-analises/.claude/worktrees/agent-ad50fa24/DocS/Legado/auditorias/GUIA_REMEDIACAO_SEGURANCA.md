# 🔐 GUIA DE REMEDIAÇÃO DE SEGURANÇA - PASSO A PASSO

## ⚡ EXECUÇÃO DA FASE 1 (CRÍTICA)

### PASSO 1: Remover .env do Histórico Git

```bash
# 1. Abrir PowerShell ou Terminal no projeto
cd "C:\WWW Projetos\neo-vidya-stream-main\Flow5"

# 2. Verificar se .env foi commitado
git log --all --full-history -- .env

# 3. Se sim, remover do histórico (ATENÇÃO: IRREVERSÍVEL)
git filter-branch --tree-filter 'rm -f .env .env.local .env.*.local' -- --all

# 4. Force push (com segurança)
git push origin --force-with-lease --all

# 5. Adicionar ao .gitignore (se não estiver)
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
git add .gitignore
git commit -m "chore: add .env to gitignore"
git push origin main
```

**Verificação**:
```bash
# Confirmar que .env foi removido
git log --all -- .env
# Deve estar vazio agora
```

---

### PASSO 2: Regenerar Credenciais

#### 2.1 Supabase

1. Acesse: https://console.supabase.com
2. Selecione seu projeto
3. Vá para **Settings → API**
4. Copie a URL do projeto (anotar em lugar seguro)
5. Para cada chave:
   - **Anon Key**: Clique em "Reveal", copie, delete
   - **Service Role Key**: Clique em "Reveal", copie, delete
6. Regenere novas chaves
7. Copie as novas chaves para um arquivo temporário seguro

#### 2.2 Mercado Pago

1. Acesse: https://www.mercadopago.com/developers/panel
2. Vá para **Credenciales**
3. Gere novas credenciais:
   - Public Key (nova)
   - Access Token (nova)
4. Revogue as antigas

#### 2.3 Atualizar Variáveis de Ambiente

Criar novo arquivo `.env.local`:
```env
# Supabase (NOVAS CREDENCIAIS)
VITE_SUPABASE_URL=https://lznckhxqbkqldedlmbfb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (NOVA)

# Mercado Pago (NOVAS CREDENCIAIS)
VITE_MERCADO_PAGO_PUBLIC_KEY=... (NOVA)

# (Outras variáveis...se houver)
```

**NUNCA commit .env**:
```bash
# Verificar
git status
# Deve mostrar: nothing to commit
```

---

### PASSO 3: Implementar Rate Limiting

#### Opção A: Supabase Realtime com Redis (Recomendado)

Se tiver Redis disponível:

```typescript
// supabase/functions/login-handler/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RATE_LIMIT_ATTEMPTS = 5
const RATE_LIMIT_WINDOW = 900 // 15 minutos em segundos

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function checkRateLimit(email: string): Promise<{
  allowed: boolean
  attemptsRemaining: number
}> {
  const key = `login_attempts:${email}`
  
  // Usar tabela rate_limits do Supabase
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('email', email)
    .eq('type', 'login')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!existing) {
    // Primeira tentativa
    await supabase.from('rate_limits').insert({
      email,
      type: 'login',
      attempts: 1,
      expires_at: new Date(Date.now() + RATE_LIMIT_WINDOW * 1000).toISOString(),
    })
    return { allowed: true, attemptsRemaining: RATE_LIMIT_ATTEMPTS - 1 }
  }

  const { attempts } = existing
  
  if (attempts >= RATE_LIMIT_ATTEMPTS) {
    return { allowed: false, attemptsRemaining: 0 }
  }

  // Incrementar tentativas
  await supabase
    .from('rate_limits')
    .update({ attempts: attempts + 1 })
    .eq('id', existing.id)

  return {
    allowed: true,
    attemptsRemaining: RATE_LIMIT_ATTEMPTS - attempts - 1,
  }
}

serve(async (req) => {
  if (req.method === 'POST') {
    const { email, password } = await req.json()

    // 1. Verificar rate limit
    const { allowed, attemptsRemaining } = await checkRateLimit(email)
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many login attempts. Try again in 15 minutes.',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. Verificar credenciais
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return new Response(
        JSON.stringify({
          error: error.message,
          attemptsRemaining,
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3. Login bem-sucedido
    await supabase
      .from('rate_limits')
      .delete()
      .eq('email', email)
      .eq('type', 'login')

    return new Response(
      JSON.stringify({ user: data.user, session: data.session }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response('Method not allowed', { status: 405 })
})
```

#### Criar Tabela no Supabase

```sql
CREATE TABLE rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL,
  type TEXT NOT NULL, -- 'login', 'reset_password', etc
  attempts INT DEFAULT 1,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(email, type)
);

CREATE INDEX idx_rate_limits_expires ON rate_limits(expires_at);
```

#### Atualizar Hook de Login

```typescript
// src/hooks/useAuth.tsx
async function handleLogin(email: string, password: string) {
  try {
    // Chamar edge function com rate limiting
    const response = await fetch('/functions/v1/login-handler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (response.status === 429) {
      const { error } = await response.json()
      throw new Error(error) // "Too many attempts..."
    }

    if (!response.ok) {
      const { error } = await response.json()
      throw new Error(error)
    }

    const { user, session } = await response.json()
    // ← Login bem-sucedido
  } catch (error) {
    console.error('Login failed:', error)
    throw error
  }
}
```

---

### PASSO 4: Configurar CORS Seguro

```typescript
// supabase/functions/_shared/cors.ts
export function corsHeaders(origin: string): Record<string, string> {
  // Whitelist de origens permitidas
  const ALLOWED_ORIGINS = [
    'https://neovidyastream.com',
    'https://app.neovidyastream.com',
    'https://admin.neovidyastream.com',
    'http://localhost:3000', // Apenas em dev
  ]

  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin)

  return {
    // Apenas aceitar origens da whitelist
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400', // 24 horas
    'Access-Control-Allow-Credentials': 'true',
  }
}

// Usar em todas as edge functions
export async function handleRequest(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const headers = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers, status: 200 })
  }

  // ... resto da lógica
}
```

---

### PASSO 5: Remover Logs Sensíveis

#### Procurar todos os console.log

```bash
# Windows PowerShell
Get-ChildItem -Path "supabase\functions" -Filter "*.ts" -Recurse | 
  Select-String "console\.(log|error|warn|info)" |
  Format-Table Path, LineNumber, Line

# Ou usar:
rg "console\." supabase/functions/ --type ts
```

#### Remover/Substituir

```typescript
// ❌ ANTES (VULNERÁVEL)
console.log('Headers:', event.headers)
console.log('Body:', event.body)
console.log('Payload:', payload)

// ✅ DEPOIS (SEGURO)
// Usar logger estruturado ou remover
if (process.env.NODE_ENV === 'development') {
  console.log('Event received at', new Date().toISOString())
  // Nunca logar dados sensíveis!
}
```

#### Usar Logger Estruturado

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    const safe = {
      ...context,
      // Remover dados sensíveis
      email: context?.email ? '***' : undefined,
      token: context?.token ? '***' : undefined,
      card: context?.card ? '***' : undefined,
    }
    console.log(`[INFO] ${message}`, safe)
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error?.message)
  },
}
```

---

## 📋 CHECKLIST DE CONCLUSÃO - FASE 1

- [ ] .env removido do histórico Git
- [ ] Novas credenciais do Supabase regeneradas
- [ ] Novas credenciais do Mercado Pago regeneradas
- [ ] .env.local atualizado com novas credenciais
- [ ] .env adicionado ao .gitignore
- [ ] Tabela `rate_limits` criada no Supabase
- [ ] Edge function `login-handler` implementada
- [ ] Hook `useAuth` atualizado com rate limiting
- [ ] Função `corsHeaders` atualizada
- [ ] Todos os `console.log` sensíveis removidos
- [ ] Testes de login com rate limiting realizados
- [ ] Deploy em produção realizado

---

## ⏱️ TEMPO ESTIMADO: 4-6 horas

- Regenerar credenciais: 1h
- Implementar rate limiting: 1.5h
- Configurar CORS: 45 min
- Remover logs: 30 min
- Testes e validação: 1h
- Deploy: 30 min

**Total: 5-6 horas de desenvolvimento**

