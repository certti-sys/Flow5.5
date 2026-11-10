# Convenções de Código e Padrões

Diretrizes para manter a consistência e qualidade do **Neo Vidya Stream**.

## Nomenclatura e Estilo
- **Frontend**: Componentes em PascalCase, hooks customizados começando com `use`.
- **Backend / SQL**: Nomes de tabelas e colunas em `snake_case`.
- **Edge Functions**: Kebab-case para nomes de pastas de funções.

## Notificações e Variáveis de Template
Para garantir que os e-mails e mensagens de WhatsApp funcionem em todos os canais, as seguintes chaves de variáveis devem ser usadas:
- `{{user_name}}`: Nome completo/exibição do aluno.
- `{{user_email}}`: E-mail de cadastro.
*Nota: Evite usar `{{nome}}` ou `{{name}}` para manter a compatibilidade total.*

## Padrões de Gamificação
- **XP**: Calculado em incrementos de 10 (lição) ou valores dinâmicos (conquistas).
- **Nível**: Calculado pela fórmula `Floor(Total_XP / 100) + 1`.

## Tratamento de Erros e Logs
- Use o `logger` compartilhado (`../_shared/logger.ts`) em todas as Edge Functions.
- Registre falhas de envio em `email_logs` ou `whatsapp_logs` para auditoria do administrador.

## Segurança e RLS
- Todas as tabelas de dados do usuário (stats, progress, achievements) devem possuir RLS habilitado.
- A política padrão deve ser: `auth.uid() = user_id`.
- Funções que operam em nome do sistema devem usar a `service_role` key de forma isolada.
