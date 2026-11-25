-- Supabase's built-in helper that turns security on for new tables runs by itself.
-- Outsiders never need to call it, so we remove their permission to.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
