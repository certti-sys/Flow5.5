# Preocupações e Pontos de Atenção (CONCERNS)

Registro de desafios técnicos, dívidas técnicas e áreas de risco identificadas no sistema.

## Performance e Escalabilidade
- **Edge Function Cold Starts**: O encadeamento de funções (`check-achievements` chamando `send-email`) pode sofrer latência se as funções estiverem frias. Considerar unificação de lógica se o tempo de resposta exceder 2s.
- **Rankings em Tempo Real**: Conforme a base de alunos crescer, o cálculo dinâmico de leaderboards pode se tornar pesado. Pode ser necessário criar visualizações materializadas ou cache no Redis.

## Integrações de Terceiros
- **WhatsApp API (Evolution/WAHA)**: Dependência crítica de serviços externos que podem sofrer desconexão. Implementar monitoramento de status da instância no Dashboard Admin.
- **Brevo API Limits**: Monitorar o consumo de créditos de e-mail para evitar interrupções no envio de boas-vindas e lembretes de retenção.

## Segurança e Abuso
- **Rate Limiting de Notificações**: Embora implementado, um usuário mal-intencionado com acesso a múltiplos IDs pode tentar estourar os limites de envio. Monitorar logs de `email_logs` e `whatsapp_logs`.
- **Evasão de Checkout**: Verificar se os webhooks de pagamento são validados via assinatura/secret para evitar fraudes de inserção direta no banco.

## Manutenibilidade
- **Variáveis de Template**: O uso de `{{user_name}}` deve ser rigorosamente seguido. Desvios para `{{nome}}` ou `{{name}}` quebram a renderização. Necessário linteamento ou validação centralizada.
- **Complexidade de CSP**: O suporte a múltiplos players de vídeo exige uma CSP vasta, o que pode abrir brechas se não for auditada regularmente.
