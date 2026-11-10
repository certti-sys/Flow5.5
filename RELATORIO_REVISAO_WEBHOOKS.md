# Relatório de Revisão de Inputs — Domínio Webhooks / Integrações

**Projeto:** Flow5.5 (`C:\Zapo API\Flow5.5`)
**Escopo:** 8 arquivos do Domínio 6 (Webhooks P2)
**Banco:** projeto flow5 (ref pbrdmjcpipuatbnkvekz)
**Contexto técnico:** Zod v4 em uso no projeto (`.error.issues`); `@hookform/resolvers/zod` v3 é incompatível com Zod v4; RLS já corrigido em todas as tabelas.

---

## 1. Resumo Executivo

| Métrica | Valor |
|---|---|
| Arquivos revisados | 8 |
| Inputs (campos de entrada) revisados | ~47 |
| Botões de cadastro/alteração/exclusão revisados | ~32 |
| Problemas encontrados | 10 |
| — Severidade P0 (bloqueia configuração) | 0 |
| — Severidade P1 (funciona, mas gera configuração incompleta / erro de console) | 5 |
| — Severidade P2 (boas práticas / consistência / risco latente) | 5 |

**Veredito geral:** Nenhum problema impede o usuário de configurar webhooks. Todas as chamadas `supabase.from(...)` apontam para tabelas que existem no migration e nos tipos TypeScript. Todos os formulários possuem validação manual mínima, estados de loading e toasts de sucesso/erro. O domínio, contudo, **não segue o padrão de validação do projeto (Zod v4)** — nenhum dos 8 arquivos usa Zod ou `react-hook-form`; todos validam manualmente com `toast.error`.

---

## 2. Por Arquivo — Problemas Encontrados

Severidade: **P0** = bloqueia o fluxo | **P1** = prejudica usabilidade / dados incompletos / risco de erro de console | **P2** = boa prática / consistência / risco latente.

### 2.1 `src/pages/admin/WebhookHub.tsx`

Nenhum input de formulário direto (página de visão geral/dashboards). Delegado a `PlatformConfigModal` para cadastro/edição.

| Linha | Problema | Severidade |
|---|---|---|
| 92–95 | `navigator.clipboard.writeText(WEBHOOK_URL)` não envolvido em `try/catch`. Se a API de clipboard for bloqueada (não-HTTPS, permissão negada), lança exceção não capturada → erro de console. | P1 |

Outros pontos observados (OK):
- `supabase.from("webhook_platforms")` (leitura, linha 44) — OK
- `supabase.from("webhook_schemas")` (leitura, linha 57) — OK
- `supabase.from("webhook_field_mappings")` (leitura, linha 73) — OK
- Loading: skeletons via `isLoading` — OK
- Feedback: `toast.success` ao copiar URL (linha 94) — OK

---

### 2.2 `src/components/admin/webhook/ConfigureMappingsWizard.tsx`

Cadastro/atualização de mapeamentos de campos (`webhook_field_mappings`).

| Linha | Problema | Severidade |
|---|---|---|
| 288 | Botão "Salvar Mapeamentos" desabilitado apenas quando `!mappings['user_email']`. O campo `event_status` é obrigatório conforme `INTERNAL_FIELDS` (linha 21), mas **não é exigido** no botão nem no `mutationFn`. Usuário pode salvar mapeamento incompleto (sem status do evento). | P1 |
| 110, 122–124 | Validações (`selectedPlatform`, `mappingsToCreate.length === 0`) lançam `throw new Error` dentro de `mutationFn` em vez de impedir o envio no botão. Erro só chega ao `onError` (toast) após tentativa de envio. | P2 |
| Todo o arquivo | Não utiliza Zod v4 nem `react-hook-form`. Validação é 100% manual com `toast.error`, fugindo ao padrão do projeto. | P2 |
| 204–205 | `Select` de mapeamento usa valor sentinela `"__none__"` convertido para `""`. Funciona, mas não é um padrão de validação declarativo. | P2 |

Outros pontos observados (OK):
- `supabase.from("webhook_field_mappings")` delete (linha 128) + insert (linha 134) — OK
- Loading: `saveMutation.isPending` no botão (linha 288) — OK
- Feedback: `toast.success` (linha 141) / `toast.error` (linha 146) — OK

---

### 2.3 `src/components/admin/webhook/EventReceiverWizard.tsx`

Cadastro e ativação de receptores de evento (`webhook_event_receivers`) + mapeamento de campos + seleção de curso.

| Linha | Problema | Severidade |
|---|---|---|
| 497–501 | Botão "Ativar Receptor" exige apenas mapeamento de `customer_email`. O campo `external_product_id` é obrigatório conforme `INTERNAL_FIELDS` (linha 26), mas **não é exigido** aqui. Usuário pode ativar receptor sem mapear ID do produto externo → webhooks não serão processados corretamente downstream. | P1 |
| 206 | `await navigator.clipboard.writeText(webhookUrl)` sem `try/catch`. Risco de exceção não capturada se clipboard estiver bloqueado. | P1 |
| 200–202 | `webhookUrl` depende de `import.meta.env.VITE_SUPABASE_URL`. Se a variável de ambiente não estiver definida, a URL gerada fica quebrada sem qualquer aviso ao usuário. | P1 |
| Todo o arquivo | Não utiliza Zod v4 nem `react-hook-form`. Validação manual com `toast.error`. | P2 |
| 153–168 | `useEffect` de polling consulta `sample_payload` a cada 2s. Funciona, mas não há limite de tentativas nem tratamento de erro explícito na consulta de polling. | P2 |

Outros pontos observados (OK):
- `supabase.from("webhook_event_receivers")` insert (linha 96) + update (linha 128) + select polling (linha 154) — OK
- `supabase.from("courses")` (linha 69) e `supabase.from("product_mappings")` (linha 83) — OK
- Loading: `isPending` nos dois mutations + `isPolling` — OK
- Feedback: toasts de sucesso (112, 140, 165) e erro (117, 119, 145) — OK
- Erro 23505 (duplicado) tratado especificamente (linha 116) — OK

---

### 2.4 `src/components/admin/webhook/FieldMappingEditor.tsx`

Cadastro/exclusão de mapeamentos individuais (`webhook_field_mappings`).

| Linha | Problema | Severidade |
|---|---|---|
| Todo o arquivo | Não utiliza Zod v4 nem `react-hook-form`. Validação manual em `handleCreate` (linha 149). | P2 |
| 301–326 | Quando `selectedSchema` não existe, cai em `<Input>` de texto livre para `source_path`. Não há validação de formato do caminho (ex: não permite caminho vazio ou caracteres inválidos além da checagem em `handleCreate`). | P2 |

Outros pontos observados (OK):
- `supabase.from("webhook_field_mappings")` insert (linha 103) + delete (linha 134) — OK
- `handleCreate` valida `platform_id`, `source_path` e `internal_field` (linha 150) — OK
- Loading: `createMutation.isPending` / `deleteMutation.isPending` — OK
- Feedback: toasts de sucesso (115, 141) e erro (127, 145) — OK

---

### 2.5 `src/components/admin/webhook/PlatformConfigModal.tsx`

Cadastro/edição/exclusão de plataformas (`webhook_platforms`).

| Linha | Problema | Severidade |
|---|---|---|
| Todo o arquivo | Não utiliza Zod v4 nem `react-hook-form`. Validação manual em `handleSave` (linha 118). | P2 |
| 68, 79 | O campo `name` é transformado silenciosamente: `data.name.toLowerCase().replace(/\s+/g, '-')`. O input não impõe esse padrão (sem `pattern`, sem máscara, sem validação de slug). Usuário pode digitar espaços e ver o valor alterado sem aviso. | P2 |
| 161 | `webhook_secret` é `type="password"` sem validação de tamanho/formato (opcional, aceito, mas sem regras). | P2 |

Outros pontos observados (OK):
- `supabase.from("webhook_platforms")` insert (linha 77) + update (linha 66) + delete (linha 102) — OK
- `handleSave` valida `name` e `display_name` (linha 118) — OK
- Loading: `saveMutation.isPending` / `deleteMutation.isPending` — OK
- Feedback: toasts de sucesso (88, 108) e erro (93, 113) — OK

---

### 2.6 `src/components/admin/webhook/ProductMappingsEditor.tsx`

Cadastro/edição/exclusão de mapeamentos de produtos (`product_mappings`).

| Linha | Problema | Severidade |
|---|---|---|
| Todo o arquivo | Não utiliza Zod v4 nem `react-hook-form`. Validação manual em `handleSubmit` (linha 203). | P2 |
| 231 | `filteredMappings` acessa `m.external_product_id.toLowerCase()` sem proteção contra `null`/`undefined`. Se algum registro vier com `external_product_id` nulo, lança `TypeError` no render → erro de console e quebra da lista. | P2 |

Outros pontos observados (OK):
- `supabase.from("product_mappings")` select (linha 68) + insert/update (linha 116/122) + delete (linha 141) + toggle (linha 159) — OK
- `supabase.from("courses")` (linha 90) — OK
- `handleSubmit` valida `platform_id`, `external_product_id`, `course_id` (se course) e `category` (se category) (linhas 206–221) — OK
- `<form onSubmit={handleSubmit}>` (linha 372) — OK (boa prática)
- Loading: `isLoading`, `saveMutation.isPending`, `deleteMutation.isPending` — OK
- Feedback: toasts de sucesso (130, 149) e erro (134, 152) — OK
- `ConfirmDeleteDialog` com `isPending` — OK

---

### 2.7 `src/components/admin/webhook/StatusMappingsEditor.tsx`

Cadastro/exclusão de mapeamentos de status (`platform_status_mappings`).

| Linha | Problema | Severidade |
|---|---|---|
| 77, 98, 118 | Usa tabela `platform_status_mappings`. O contexto da tarefa mencionava `webhook_platform_status_mappings`, mas o migration real (linha 365) e os tipos (linha 1300) confirmam `platform_status_mappings`. **O código está correto; não é um bug.** Apenas nota de divergência de nomenclatura na documentação de escopo. | — (informativo) |
| Todo o arquivo | Não utiliza Zod v4 nem `react-hook-form`. Validação manual em `handleAddMapping` (linha 145). | P2 |

Outros pontos observados (OK):
- `supabase.from("platform_status_mappings")` select (linha 76) + insert (linha 98) + delete (linha 117) — OK
- `handleAddMapping` valida `selectedPlatform` e `newExternalValue.trim()` (linhas 146–158) — OK
- Loading: `addMutation.isPending` / `deleteMutation.isPending` — OK
- Feedback: toasts de sucesso (104, 124) e erro (110, 128, 135, 151) — OK

---

### 2.8 `src/components/admin/webhook/WebhookSchemaViewer.tsx`

Visualizador somente-leitura de schemas descobertos. Nenhum input de gravação.

| Linha | Problema | Severidade |
|---|---|---|
| — | Nenhum problema encontrado. Apenas leitura de dados passados via props. Nenhum `supabase.from` direto, nenhum envio, nenhum formulário. | — |

Outros pontos observados (OK):
- Recebe `loading` prop e exibe estado de carregamento (linha 81–87) — OK
- Nenhum toast necessário (view-only) — OK

---

## 3. Problemas Críticos

**Não há problemas P0.** Nenhum usuário é completamente bloqueado de configurar webhooks. Tudo o que segue é P1 (funciona, mas pode gerar configuração incompleta ou erro de console):

| # | Arquivo:linha | Problema | Impacto |
|---|---|---|---|
| C1 | `EventReceiverWizard.tsx:497–501` | `external_product_id` (obrigatório) não é exigido para ativar o receptor. | Receptor ativado sem mapeamento de produto → webhooks de compra não concedem acesso ao curso. |
| C2 | `ConfigureMappingsWizard.tsx:288` | `event_status` (obrigatório) não é exigido no botão salvar. | Mapeamento salvo sem status do evento → transações não são classificadas. |
| C3 | `EventReceiverWizard.tsx:206` | `navigator.clipboard.writeText` sem `try/catch`. | Erro de console não capturado se clipboard bloqueado; cópia de URL falha silenciosamente. |
| C4 | `WebhookHub.tsx:92–95` | Mesmo problema do C3 na cópia da URL do endpoint único. | Erro de console ao tentar copiar URL. |
| C5 | `EventReceiverWizard.tsx:200–202` | URL do webhook depende de `VITE_SUPABASE_URL` sem fallback/validação. | Se a env var estiver ausente, a URL exibida fica inválida sem aviso. |

---

## 4. Recomendações de Correção

Abaixo, código específico para cada problema. Todos os snippets são destinados a substituir o trecho indicado.

### 4.1 C1 — Exigir `external_product_id` no EventReceiverWizard (P1)

Arquivo: `src/components/admin/webhook/EventReceiverWizard.tsx`
Linha: 495–501

**Atual:**
```tsx
disabled={
  updateReceiverMutation.isPending ||
  !fieldMappings.find(m => m.internal_field === 'customer_email') ||
  (!useGlobalMappings && !fixedCourseId)
}
```

**Correção:** exigir também mapeamento de `external_product_id`:
```tsx
disabled={
  updateReceiverMutation.isPending ||
  !fieldMappings.find(m => m.internal_field === 'customer_email') ||
  !fieldMappings.find(m => m.internal_field === 'external_product_id') ||
  (!useGlobalMappings && !fixedCourseId)
}
```

---

### 4.2 C2 — Exigir `event_status` no ConfigureMappingsWizard (P1)

Arquivo: `src/components/admin/webhook/ConfigureMappingsWizard.tsx`
Linha: 286–289

**Atual:**
```tsx
disabled={saveMutation.isPending || !selectedPlatform || !mappings['user_email']}
```

**Correção:** exigir também `event_status`:
```tsx
disabled={
  saveMutation.isPending ||
  !selectedPlatform ||
  !mappings['user_email'] ||
  !mappings['event_status']
}
```

---

### 4.3 C3/C4 — Proteger `navigator.clipboard.writeText` com try/catch (P1)

Arquivo A: `src/components/admin/webhook/EventReceiverWizard.tsx`
Linha: 205–209

**Atual:**
```tsx
async function copyUrl() {
  await navigator.clipboard.writeText(webhookUrl)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}
```

**Correção:**
```tsx
async function copyUrl() {
  try {
    await navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('URL copiada!')
  } catch {
    toast.error('Não foi possível copiar a URL. Copie manualmente.')
  }
}
```

Arquivo B: `src/pages/admin/WebhookHub.tsx`
Linha: 92–95

**Atual:**
```tsx
const copyWebhookUrl = () => {
  navigator.clipboard.writeText(WEBHOOK_URL)
  toast.success("URL do webhook copiada!")
}
```

**Correção:**
```tsx
const copyWebhookUrl = async () => {
  try {
    await navigator.clipboard.writeText(WEBHOOK_URL)
    toast.success("URL do webhook copiada!")
  } catch {
    toast.error("Não foi possível copiar a URL. Copie manualmente.")
  }
}
```
(Nota: atualizar o `onClick` do botão na linha 203 não é necessário pois já chama `copyWebhookUrl`.)

---

### 4.4 C5 — Validar `VITE_SUPABASE_URL` antes de montar a URL (P1)

Arquivo: `src/components/admin/webhook/EventReceiverWizard.tsx`
Linha: 200–202

**Atual:**
```tsx
const webhookUrl = webhookToken
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhooks-ingest/${webhookToken}`
  : ''
```

**Correção:** adicionar fallback e aviso visual:
```tsx
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const webhookUrl = webhookToken && supabaseUrl
  ? `${supabaseUrl}/functions/v1/webhooks-ingest/${webhookToken}`
  : ''
```

E no render do `<code>` (linha 335–337), exibir aviso quando `!supabaseUrl`:
```tsx
{!supabaseUrl && (
  <p className="text-xs text-destructive">
    Variável VITE_SUPABASE_URL não configurada. URL indisponível.
  </p>
)}
```

---

### 4.5 P2 — Adotar Zod v4 para validação de formulários (todos os arquivos com forms)

Contexto do projeto: Zod v4 está em uso (`.error.issues`, não `.error.errors`); `@hookform/resolvers/zod` v3 é incompatível com Zod v4. Nenhum dos 7 arquivos com formulário usa Zod.

**Arquivos afetados:**
- `ConfigureMappingsWizard.tsx`
- `EventReceiverWizard.tsx`
- `FieldMappingEditor.tsx`
- `PlatformConfigModal.tsx`
- `ProductMappingsEditor.tsx`
- `StatusMappingsEditor.tsx`
- `WebhookHub.tsx` (apenas botão de cópia)

**Recomendação:** criar schemas Zod v4 compartilhados em `src/lib/schemas/webhooks.ts` (exemplo) e usá-los com validação manual (sem `react-hook-form`, que não está presente neste domínio):

```ts
// src/lib/schemas/webhooks.ts
import { z } from "zod"

export const platformSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  display_name: z.string().min(1, "Nome de exibição é obrigatório"),
  webhook_secret: z.string().optional(),
})

export const statusMappingSchema = z.object({
  platform_id: z.string().min(1, "Selecione uma plataforma"),
  external_value: z.string().min(1, "Digite o valor externo"),
  internal_status: z.enum(["approved", "refunded", "cancelled", "pending"]),
})

export const productMappingSchema = z.object({
  platform_id: z.string().min(1, "Selecione uma plataforma"),
  external_product_id: z.string().min(1, "Informe o ID do produto externo"),
  grant_type: z.enum(["course", "category"]),
  course_id: z.string().optional(),
  category: z.string().optional(),
}).refine(
  (data) => data.grant_type !== "course" || data.course_id,
  { message: "Selecione um curso", path: ["course_id"] }
).refine(
  (data) => data.grant_type !== "category" || data.category,
  { message: "Selecione uma categoria", path: ["category"] }
)
```

Uso em um handler (exemplo para `PlatformConfigModal.handleSave`):
```ts
const handleSave = () => {
  const result = platformSchema.safeParse(formData)
  if (!result.success) {
    const issue = result.error.issues[0]
    toast.error(issue?.message ?? "Erro de validação")
    return
  }
  saveMutation.mutate(result.data)
}
```

---

### 4.6 P2 — Corrigir transformação silenciosa do `name` na plataforma (P2)

Arquivo: `src/components/admin/webhook/PlatformConfigModal.tsx`
Linha: 68 e 79

**Correção:** validar o slug no client antes de enviar, em vez de transformar silenciosamente. Adicionar ao `handleSave`:
```ts
const slug = formData.name.toLowerCase().replace(/\s+/g, "-")
if (slug !== formData.name) {
  toast.error("Use apenas letras minúsculas, números e hifens (sem espaços).")
  return
}
```
E usar `slug` no insert/update em vez de `data.name.toLowerCase()...`.

---

### 4.7 P2 — Proteger `external_product_id.toLowerCase()` contra null (P2)

Arquivo: `src/components/admin/webhook/ProductMappingsEditor.tsx`
Linha: 231

**Atual:**
```tsx
m.external_product_id.toLowerCase().includes(term)
```

**Correção:**
```tsx
String(m.external_product_id ?? "").toLowerCase().includes(term)
```

---

## 5. Checklist de Tabelas Supabase (verificado no migration e tipos)

| Tabela | Usada em | Migration | Tipos TS | Status |
|---|---|---|---|---|
| `webhook_platforms` | PlatformConfigModal, WebhookHub | `supabase/migrations/...baseline_sync.sql:266` | `types.ts:1995` | ✅ OK |
| `webhook_event_receivers` | EventReceiverWizard | `:650` | `types.ts:1844` | ✅ OK |
| `webhook_field_mappings` | ConfigureMappingsWizard, FieldMappingEditor | `:387` | `types.ts:1948` | ✅ OK |
| `platform_status_mappings` | StatusMappingsEditor | `:365` | `types.ts:1300` | ✅ OK (nome real, não `webhook_platform_status_mappings`) |
| `webhook_schemas` | WebhookHub (leitura) | `:374` | `types.ts:2060` | ✅ OK |
| `webhook_transactions` | Não usada nos 8 arquivos do escopo | `:291` | `types.ts:2118` | — (fora de escopo) |

---

## Conclusão

O domínio de webhooks está **funcionalmente completo**: todos os inputs possuem validação mínima, todos os envios usam as tabelas corretas, loading e toasts estão presentes em todos os formulários, e não há erros 403 de RLS esperados (RLS já corrigido). Os principais riscos são campos obrigatórios não exigidos no momento do salvamento (C1, C2) e chamadas à API de clipboard sem proteção (C3, C4), além da ausência de Zod v4 como padrão de validação (P2 transverso).
