# Architecture

## Client-Side (React)
- **Framework**: Vite-powered React SPA.
- **Data Fetching**: React Query for caching and state syncing.
- **Routing**: Client-side routing via React Router.
- **Auth**: Supabase Client SDK for session management.

## Server-Side (Supabase)
- **PostgreSQL**: Relational database with 40+ tables.
- **Edge Functions**: Deno-based microservices for sensitive logic (payments, analytics, webhooks).
- **Security**: Row Level Security (RLS) is partially implemented (needs audit).

## Data Flow
1. User interacts with React UI.
2. React hooks call Supabase Client (Direct DB) or Edge Functions (Complex Logic).
3. Edge Functions interact with Service Role (Bypass RLS) if necessary (e.g., admin tasks).
4. Webhooks from external providers trigger Edge Functions for ingestion.

---
# Structure

## Root
- `.agent/`, `.agents/`: AI skills and GSD framework.
- `.planning/`: GSD project state and roadmap.
- `DocS/`: Detailed system analysis and action plans.
- `supabase/`: Database migrations and Edge Functions.
- `src/`: Main application source code.

## src/
- `components/`: UI components (shadcn/ui + custom).
- `pages/`: Route-level pages (Dashboard, Admin, Course, etc).
- `hooks/`: Custom React hooks (useAuth, usePayments, etc).
- `integrations/`: Third-party SDK initializations (Supabase, Mercado Pago).
- `lib/`: Utility functions and helper classes.
- `types/`: TypeScript definitions and Zod schemas.

---
# Conventions

## Code Style
- **TypeScript**: Strict typing required.
- **Functional Components**: Use Arrow functions with `tsx` extension.
- **Imports**: Bullet-proof imports with `@` aliases if configured.

## UI/UX
- **Tailwind**: Utility-first CSS classes.
- **shadcn/ui**: Prefer standard components when possible.
- **Bento 2.0**: Trend-ready modular layouts (Premium aesthetic).

## Backend
- **Naming**: Snake_case for database tables and columns.
- **Edge Functions**: Use the `_shared` folder for common logic (CORS, Shared Types).
- **Zod**: Use Zod for runtime validation of any external input.
