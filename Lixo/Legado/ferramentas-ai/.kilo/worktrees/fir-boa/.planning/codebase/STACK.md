# Tech Stack

## Core
- **Framework**: React 18.3.1 (Vite 7.3.1)
- **Language**: TypeScript 5.8.3
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: shadcn/ui (Radix UI)
- **State Management**: React Query (@tanstack/react-query 5.83.0)
- **Routing**: React Router DOM 6.30.1
- **Forms**: React Hook Form + Zod

## Backend & Infrastructure
- **Database/Auth**: Supabase (@supabase/supabase-js 2.84.0)
- **Functions**: Supabase Edge Functions (Deno Runtime)
- **Storage**: Supabase Storage

## Key Libraries
- **Payments**: @mercadopago/sdk-react 1.0.7
- **Animations**: Framer Motion 12.38.0
- **Charts**: Recharts 2.15.4
- **Drag & Drop**: @dnd-kit 6.3.1
- **Video**: React Player 3.4.0

---
# Integrations

## Supabase (Core Backend)
- **Database**: PostgreSQL (40+ tables)
- **Auth**: Email/Password, JWT (Anon/Service keys)
- **Edge Functions**: Logic/Webhooks processing

## Mercado Pago (Payments)
- **Checkout**: SDK React integrated
- **Webhooks**: IPN/Webhook support for payment status

## External Communications
- **Email**: Brevo/SMTP configured via Edge Functions
- **WhatsApp**: Multi-provider (Meta, Z-API, WAHA, Evolution)

## Video Providers
- **YouTube**: Embed integration
- **Vimeo**: Embed integration
- **Direct Link**: MP4 streaming support
