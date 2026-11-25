# Laced Delivery Manager

Order and courier management app for Laced (Egypt). Arabic and English, mobile-first for couriers.

## Status

- Stage 1 (requirements): done
- Stage 2 (database): done, see `supabase/migrations/`
- Stage 3 (admin dashboard): in progress. Sign-in and dashboard shell done; orders, couriers and areas screens next

## Database

Tables: `areas`, `couriers`, `reasons`, `orders`, `order_items`, `order_history`, `alerts`.

Rules built into the database:

- Order history cannot be edited or deleted.
- Orders cannot be deleted once they exist.
- Statuses change only through `change_order_status` / `assign_order`, which record who and when.
- Returned and Failed orders require a reason.
- Postponed orders require a new date and keep the same order ID.
- A courier can only change orders assigned to them.
- Nobody can read the tables directly with public keys; only the app's own server can.

## App

Next.js (App Router) + TypeScript + Tailwind + Supabase. Arabic-first with full RTL; English switch on every screen.

Settings (set in the hosting site settings, never in code; see `.env.example`):

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ADMIN_EMAIL`
- `SUPABASE_SERVICE_ROLE_KEY` (secret, server only)

Run locally: `npm install`, then `npm run dev`.
