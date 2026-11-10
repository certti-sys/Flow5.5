# Integrações de Sistemas

Detalhamento técnico das conexões entre o **Neo Vidya Stream** e serviços externos.

## 📧 Email (Brevo)
- **Método**: API v3 via HTTP POST.
- **Função**: `send-email` (Edge Function).
- **Branding**: Utiliza o component `getBrandedWrapper` para envelopar o conteúdo com cabeçalho e rodapé customizados.
- **Toggles**: Respeita as configurações de `notification_toggles` no banco de dados.

## 💬 WhatsApp (Evolution API)
- **Método**: REST API via chamadas autenticadas por apikey.
- **Função**: `send-whatsapp` (Edge Function).
- **Fluxo**: Recebe uma `templateKey`, busca a mensagem no banco, aplica substituição de variáveis e envia o texto final.
- **Indicadores**: Suporte a indicador de digitação ("composing") e delay entre mensagens configurável.

## 💰 Gateways de Pagamento (Mercado Pago)
- **Frontend**: Integrado via `MercadoPagoButton` e `checkout.js`.
- **Backend**: Processamento de IPNs (Webhooks) na função `webhook-payment`.
- **Status**: Sincronização automática de transações para liberação de cursos.

## 🎥 Video Delivery (Multi-Provider)
- **UniversalPlayer**: Componente abstrato que gerencia Iframes e Players nativos para:
    - **Bunny.net**: Embed direto e via API.
    - **Panda Video**: Integração via Iframe otimizado.
    - **YouTube / Vimeo**: Players padrão.
    - **VTurb**: Foco em VSL e vídeos de vendas.

## 🔄 Hub de Webhooks (Kiwify/Hotmart)
- **Entrada**: Função `webhooks-ingest`.
- **Lógica**: Mapeia o payload externo para o esquema interno de usuários e acessos do Flow.
