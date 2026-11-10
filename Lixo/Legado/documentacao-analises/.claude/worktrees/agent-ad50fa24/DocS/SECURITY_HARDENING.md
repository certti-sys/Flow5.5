# Security Hardening & Platform Resilience (Enterprise-Ready)

Este documento detalha as camadas de segurança implementadas na Fase 2 do Hardening, visando a preparação do sistema para revenda multi-tenant e proteção contra vetores de ataque modernos (XSS, CSRF, SSRF).

## 1. Gestão de Sessão (Anti-XSS)

### Transição de LocalStorage para Cookies
Tradicionalmente, SPAs armazenam tokens JWT no `LocalStorage`, o que os torna vulneráveis a roubo via scripts injetados (XSS).
- **Implementação**: Custom `CookieStorage` adapter no cliente Supabase.
- **Segurança**: Atributos `Secure` (apenas HTTPS) e `SameSite=Lax` (prevenção de CSRF básico).
- **Impacto**: O roubo de tokens via XSS é mitigado, pois o navegador gerencia a persistência de forma isolada do `window.localStorage`.

## 2. Proteção contra CSRF (Cross-Site Request Forgery)

### Header Customizado Obrigatório
Implementamos uma defesa baseada no header `X-Requested-With`.
- **Frontend**: O cliente Supabase foi configurado com um header global `X-Requested-With: XMLHttpRequest`.
- **Backend (Edge Functions)**: A função compartilhada `validateCSRF` em `_shared/cors.ts` intercepta todas as requisições de alteração de estado (POST, PUT, DELETE, PATCH).
- **Bloqueio**: Requisições sem este header ou disparadas de origens não autorizadas são bloqueadas instantaneamente (Status 403).

## 3. Validação Estrita de Dados (Anti-Injection)

### Zod Schemas
Toda entrada de dados em funções críticas agora passa por validação de esquema via Zod.
- **Payment Ops**: Validação de IDs de gateway, produtos e payloads de pagamento.
- **Video Proxy**: Validação estrita de provedores e IDs de vídeo (Regex: `/^[a-zA-Z0-9_-]+$/`), eliminando riscos de Path Traversal e Injeção de Protocolo (SSRF).
- **Create User**: Validação de domínios de e-mail e roles.

## 4. Proteção contra SSRF (Server-Side Request Forgery)

### Escaneamento de Proxy de Vídeo
O `video-proxy` agora atua como um gateway seguro:
- **White-listing**: Apenas provedores aprovados (YouTube, Vimeo, Panda, Bunny, VTurb) são permitidos.
- **Identifier Validation**: IDs de vídeo são filtrados para impedir que atacantes usem a função para escanear a rede interna ou acessar metadados da nuvem.

## 5. Auditoria e Rate Limiting

### Auditoria Estendida
- Funções administrativas (`create-user`, `delete-user`, `reset-password`) agora capturam `IP`, `User-Agent` e detalhes do recurso afetado.
- Os logs são persistidos na tabela `audit_logs` para conformidade regulatória.

### Rate Limiting Inteligente
- **Proteção por IP**: Para funções públicas/anônimas.
- **Proteção por UserID**: Para funções autenticadas.
- **Configurações**: Ajustados por criticidade (ex: 3 tentativas de reset de senha a cada 15 min).

---
*Este hardening garante que a plataforma atenda aos requisitos de segurança necessários para ambientes corporativos e revenda de software (SaaS).*
