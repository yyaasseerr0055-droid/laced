# Laced Delivery Manager

Order and courier management app for Laced (Egypt). Arabic and English, mobile-first for couriers.

## Status

- Stage 1 (requirements): done
- Stage 2 (database): done, see `supabase/migrations/`
- Stage 3 (admin dashboard): next

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
