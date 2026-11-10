# RELATÓRIO DE AUDITORIA DE SEGURANÇA - Flow5 Neo Vidya Stream
**Data da Análise:** 01/04/2026  
**Projeto:** C:\WWW Projetos\neo-vidya-stream-main\Flow5  
**Tipo:** Plataforma de Ensino a Distância (EAD) com Pagamentos

---

## SUMÁRIO EXECUTIVO

Este relatório identifica **7 VULNERABILIDADES CRÍTICAS** e **12 PROBLEMAS DE SEGURANÇA** que requerem remediação imediata. A plataforma implementa autenticação via Supabase, mas possui configurações de CORS amplamente permissivas, credenciais expostas e falta de proteção adequada contra ataques.

**Nível de Risco Geral:** 🔴 **CRÍTICO**

---

## 1. AUTENTICAÇÃO

### 1.1 Implementação
**Status:** ✅ Implementada via Supabase
- **Arquivo:** `src/hooks/useAuth.tsx`
- **Método:** JWT com Supabase Auth
- **Sessão:** Persistida automaticamente no localStorage pelo Supabase

### 1.2 Análise Detalhada

#### ✅ Pontos Positivos
- Uso de Supabase Auth (gerenciado por terceiros)
- Auto-refresh de tokens ativado
- Detecção de sessão em URL implementada
- Verificação de estado de autenticação centralizada

#### 🔴 VULNERABILIDADE CRÍTICA #1: Tokens Armazenados em localStorage
```typescript
// src/hooks/useAuth.tsx - auth: { persistSession: true }
```
**Problema:** Tokens JWT são armazenados em localStorage, vulnerável a XSS.
**Risco:** Se um atacante executar JavaScript no contexto da aplicação, pode acessar `localStorage.getItem('sb-[PROJECT]-auth-token')` e obter tokens válidos.

**Recomendação:**
```typescript
// Usar httpOnly cookies para armazenamento de tokens
// Configurar Supabase para usar cookies em vez de localStorage
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'sb-auth-token',
    storage: window.sessionStorage,  // Menos persistente que localStorage
    detectSessionInUrl: true,
    autoRefreshToken: true,
    flowType: 'pkce'  // Usar PKCE para melhor segurança
  }
});
```

#### 🔴 VULNERABILIDADE CRÍTICA #2: Sem Rate Limiting em Autenticação
- Nenhuma implementação de rate limiting na função `signIn()` ou `signUp()`
- Permite brute force attacks ilimitados contra contas

**Recomendação:**
```typescript
// Implementar rate limiting por IP/Email
const signIn = async (email: string, password: string) => {
  // Implementar throttling
  // Máximo 5 tentativas por 15 minutos por email
  const rateLimitKey = `auth-attempt-${email}`;
  const attempts = await getAuthAttempts(email);
  
  if (attempts > 5) {
    toast.error("Muitas tentativas. Tente novamente em 15 minutos.");
    return { error: "Rate limited" };
  }
};
```

### 1.3 Token Management
**Status:** ⚠️ Delegado ao Supabase, mas sem configurações explícitas

```typescript
// src/integrations/supabase/client.ts
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,     // ✅ Refresco automático
    persistSession: true,        // 🔴 localStorage (inseguro)
    detectSessionInUrl: true
  }
});
```

**Problemas:**
- Sem logout automático por timeout
- Sem revogação explícita de tokens
- Sem rotação forçada de tokens

---

## 2. AUTORIZAÇÃO & PERMISSÕES

### 2.1 Estrutura de Proteção
**Status:** ✅ Implementada com ProtectedRoute e AdminProtectedRoute

#### Fluxo de Proteção:
```
┌─────────────────────────────────────────┐
│ App.tsx - Define rotas protegidas       │
├─────────────────────────────────────────┤
│ ProtectedRoute (usuário autenticado)    │
│ AdminProtectedRoute (usuário + admin)   │
└─────────────────────────────────────────┘
  │
  ├─ src/components/ProtectedRoute.tsx
  └─ src/components/AdminProtectedRoute.tsx
```

### 2.2 Análise Detalhada

#### ✅ ProtectedRoute
```typescript
// src/components/ProtectedRoute.tsx
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};
```
- ✅ Valida se usuário está logado
- ✅ Redireciona para login se não autenticado

#### ✅ AdminProtectedRoute
```typescript
// src/components/AdminProtectedRoute.tsx
const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { data: isAdmin } = useQuery({
    queryKey: ["admin-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });
  
  if (loading || isCheckingAdmin) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;  // ✅ Bloqueia não-admins
  
  return <>{children}</>;
};
```

### 2.3 Níveis de Acesso
```
┌──────────────────────────────┐
│ Níveis de Acesso (3 camadas) │
├──────────────────────────────┤
│ 1. Guest (não logado)        │ → /login
│ 2. User (logado)             │ → /dashboard, /curso/*, /aula/*
│ 3. Admin (logado + admin)    │ → /admin/*
└──────────────────────────────┘
```

### 2.4 Problemas de Autorização

#### 🔴 VULNERABILIDADE CRÍTICA #3: Autorização Apenas no Frontend
**Problema:** Verificação de permissão ocorre apenas no componente ProtectedRoute.

```typescript
// ❌ INSEGURO: Proteção apenas no frontend
if (!isAdmin) return <Navigate to="/dashboard" replace />;
```

Um atacante pode:
1. Modificar localStorage para simular admin
2. Chamar APIs diretamente sem passar pelo frontend
3. Acessar endpoints diretamente com curl/Postman

**Recomendação:**
- **TODAS** as operações sensíveis devem validar permissões no backend (Supabase RLS)
- Frontend é apenas UI, backend é segurança real

#### 🔴 PROBLEMA: Sem Validação de Permissões em Operações CRUD
Exemplo vulnerável no `src/pages/admin/Courses.tsx`:
```typescript
const { data: adminCourses, isLoading } = useQuery({
  queryKey: ["adminCourses"],
  queryFn: async () => {
    const { data } = await supabase
      .from("courses")
      .select("*");  // 🔴 Sem verificação se user é admin
    return data;
  }
});
```

**Recomendação:** Implementar RLS (Row Level Security) no Supabase:
```sql
-- Supabase RLS Policy
CREATE POLICY "Apenas admins podem listar todos os cursos"
ON courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
```

---

## 3. PROTEÇÃO DE DADOS

### 3.1 Variáveis de Ambiente

#### 🔴 VULNERABILIDADE CRÍTICA #4: Credenciais Expostas em .env
**Arquivo:** `.env` (COMMITADO NO GIT!)

```
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_PROJECT_ID="lznckhxqbkqldedlmbfb"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://lznckhxqbkqldedlmbfb.supabase.co"
```

**Problemas Críticos:**
1. ✅ `.gitignore` inclui `.env` (bom!)
2. 🔴 **MAS** `.env` ESTÁ COMMITADO NO GIT - credenciais visíveis no histórico
3. 🔴 Chaves públicas expostas no código frontend (isso é esperado)
4. 🔴 **NUNCA** devem conter `SUPABASE_SERVICE_ROLE_KEY`

**Status:** `.env.example` bem configurado:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Recomendação URGENTE:**
```bash
# 1. Regenerar TODAS as chaves Supabase (as antigas estão expostas)
# 2. Remover .env do histórico Git
git rm --cached .env
git filter-branch --tree-filter 'rm -f .env' -- --all
git push origin --force-with-lease

# 3. Adicionar variavelmente de ambiente apenas em CI/CD
# GitHub Actions: usar secrets ou .env.local não commitado

# 4. Nunca expor SERVICE_ROLE_KEY no frontend
# Usar apenas ANON_KEY com RLS no backend
```

### 3.2 Armazenamento de Dados Sensíveis

#### 🟡 PROBLEMA: Dados de Pagamento Potencialmente Expostos
**Arquivo:** `src/types/payment.ts`
```typescript
export interface PaymentGateway {
  id: string;
  public_key: string;
  secret_key?: string;  // 🔴 Nunca armazenar em banco de dados público
  webhook_secret?: string;
}
```

**Problema:** `secret_key` pode estar visível em queries

**Recomendação
