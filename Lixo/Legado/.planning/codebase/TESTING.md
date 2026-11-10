# Estratégia de Teste e Validação

Processos para garantir a integridade e funcionalidade do **Neo Vidya Stream**.

## Verificação de Notificações
- **Emails**: Devem ser testados enviando e-mails reais para contas de controle. Verificar se o branding HTML é renderizado corretamente no Outlook, Gmail e Apple Mail.
- **WhatsApp**: Testar fluxos de `streak_at_risk` alterando manualmente o `last_activity_date` de um usuário de teste para ontem.

## Validação de Gamificação
- Simular conclusão de aulas para verificar disparos de e-mail e WA.
- Checar se as badges desbloqueadas no backend aparecem imediatamente na UI do perfil (Perfil integrado).

## Testes de Edge Functions
- Usar chamadas locais com a Service Key para testar rotas de admin.
- Validar se o `Rate Limiter` bloqueia requisições após o limite definido (ex: 15 e-mails/hora).

## Auditoria de Segurança
- Utilizar o `sys-health` para checar conectividade.
- Rodar o plugin de auditoria de CSP para garantir que nenhuma fonte de vídeo foi bloqueada indevidamente.

## Fluxo de Pagamentos
- Realizar compras em modo Sandbox do Mercado Pago.
- Validar se o webhook processa e libera o acesso ao curso sem intervenção manual.
