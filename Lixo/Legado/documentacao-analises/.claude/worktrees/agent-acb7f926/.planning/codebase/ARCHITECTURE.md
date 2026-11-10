# Arquitetura do Sistema

Visão geral da estrutura e fluxos de dados do **Neo Vidya Stream**.

## Fluxo de Autenticação e Acesso
1. Usuário realiza login via `Auth.tsx`.
2. Supabase emite JWT.
3. RLS protege consultas ao banco de dados baseando-se no `auth.uid()`.
4. `useCourseAccess` verifica permissão antes de renderizar conteúdo.

## Motor de Gamificação (Async Logic)
O progresso do aluno aciona uma cadeia de eventos:
- **Client-side**: O componente de lição chama `lesson-progress`.
- **Edge Function**: `check-achievements` é invocada.
- **Detecção**: A função compara o estado atual com critérios de conquista e nível.
- **Notificação**: Se ocorrer um evento (Level Up/Unlock), a função dispara requisições internas para:
    - `send-email`: Formata e envia e-mail com branding.
    - `send-whatsapp`: Despacha mensagem via Evolution API.

## Notificações e Retenção
- **Event-driven**: Disparadas por ações do usuário.
- **Scheduled (Cron)**: A função `retention-cron` analisa periodicamente o `user_stats` para identificar e notificar ofensivas em risco.
- **Templates**: Centralizados no banco de dados (`message_templates`) ou Hardcoded em variáveis de admin (`email_settings`).

## Segurança em Camadas
- **Perímetro**: CSP bloqueia scripts não autorizados.
- **Aplicação**: Rate limiters em Edge Functions previnem abusos de API de e-mail/wa.
- **Infra**: Logs de auditoria para transações financeiras e acessos administrativos.
