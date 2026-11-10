# 📡 Manual Técnico: Integrações e Processamento de Webhooks

Este documento consolida a memória técnica e o funcionamento da infraestrutura de webhooks (recebimento, mapeamento, criação/remoção de contas de alunos) no Flow5. Toda essa infraestrutura opera em Serverless na Edge Network do Supabase (Edge Functions).

## 1. Arquitetura de Recepção (Edge Function `webhook-payment`)

A principal função responsável por ingerir eventos financeiros de plataformas de terceiros (Hotmart, Kiwify, Cakto, WooCommerce, MercadoPago) é a API `webhook-payment/index.ts`.

A arquitetura trabalha com os seguintes princípios:

1. **Retenção Completa (Auditoria):** O payload bruto de todas as postbacks é preservado no log (`webhook_transactions` e `webhook_samples`) antes da delegação dos processos.
2. **Dynamic JSON Mapping:** Em vez de realizar um *hardcode* das chaves da Hotmart vs Kiwify no backend, o servidor processa a conversão baseado no banco de dados. 
3. **Account Auto-Provisioning:** Caso a compra seja classificada como `approved`, e o utilizador não exista localmente na tabela `auth.users`, a conta é provisionada dinamicamente, enviando senha por e-mail de imediato.
4. **Access Management:** Em caso de compra aprovada, a liberação mapeada para aquele ID de Produto externo é gravada no banco `user_course_access`. Em caso de `refunded` ou `cancelled`, ela é revogada na mesma medida.

## 2. Inserção Segura de Dados e o Campo WhatsApp

Recentemente atualizamos a lógica para que o campo de número móvel (WhatsApp/telefone) enviado no PayLoad seja validado internamente e compense na criação da conta do perfil do usuário.

A criação / atualização agora se porta desta maneira:
- O schema da requisição foi refinado via `Zod` (na const `NormalizedDataSchema`) para incluir o mapeamento opcional de `customerPhone`.
- Na injeção de tabelas, se o usuário for NOVO, o telefone vai para os metadados do Supabase. E logo **após**, será empurrado para a tabela principal `profiles` na coluna estipulada (`whatsapp`).
- Se o usuário já possuir uma conta sem preenchimento deste campo, o recebimento atualizará sua tabela `profiles` preenchendo as brechas com as referências obtidas pela requisição HTTP POST da plataforma.

> [!NOTE]
> Nenhum Schema / Migration SQL precisou ser alterado para aplicar este roteamento de WhatsApp, pois as tabelas primárias — `profiles` para guardar a coluna `whatsapp` e a tabela `webhook_field_mappings` — já haviam sido provisionadas anteriormente por antigas implementações. Apenas implementamos a funcionalidade na borda (Edge Function) fechando o ciclo.

## 3. O Mapeador Interno (`webhook_field_mappings`) 

No painel de controle administrativo do Flow5 (em **Webhook Hub > Modo Avançado > Mappings**), está a relação das variáveis externas com nossas chaves fixas. Hoje, a Edge Function pesquisa na tabela nativa `webhook_field_mappings` os dados configurados para:

- `user_email` (E-mail)
- `user_name` (Nome Completo)
- `user_phone` (WhatsApp/Telefone)
- `product_id` (Identificação da Oferta)
- `transaction_id` (Código da Compra Genuíno)
- `event_status` (Aprovação ou Reembolso bruto)

Esta abstração de mapeamento significa que: independente da plataforma de checkout originária enviar seus dados do comprador como `buyer.phone_checkout` ou preferir usar `Customer.Contact`, o administrador molda onde a função procurará este dado através do Dashboard em conformidade com as descrições em tela.

## 4. Deploy Subsequente 
A Edge Function foi arquitetada e adaptada via TypeScript (`webhook-payment`). Toda e qualquer melhoria neste motor de processamento lógico dependerá do deploy utilizando o Supabase Serverless CLI de desenvolvimento local:

```bash
npx supabase functions deploy webhook-payment
```
