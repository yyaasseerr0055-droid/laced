-- Laced Delivery Manager: initial database structure
-- Safe to read: it only creates empty tables, rules and a few starter reasons.

-- 1) Areas (fixed list the admin picks from)
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) Couriers (personal link token + hashed 4-digit PIN + preferred language)
create table public.couriers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  language text not null default 'ar' check (language in ('ar', 'en')),
  access_token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  pin_hash text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3) Reasons for Failed / Returned orders (Arabic + English, editable)
create table public.reasons (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('failed', 'returned')),
  name_ar text not null,
  name_en text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

-- 4) Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity (start with 1001) unique,
  customer_name text not null,
  customer_phone text not null,
  address text not null,
  area_id uuid references public.areas (id),
  cod_amount numeric(10, 2) not null default 0 check (cod_amount >= 0),
  courier_id uuid references public.couriers (id),
  status text not null default 'new' check (status in (
    'new', 'assigned', 'out_for_delivery', 'delivered',
    'postponed', 'returned', 'failed', 'unavailable'
  )),
  status_reason_id uuid references public.reasons (id),
  delivery_date date,
  notes text,
  customer_location_link text,
  courier_notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reason_required
    check (status not in ('returned', 'failed') or status_reason_id is not null),
  constraint courier_required
    check (status in ('new', 'unavailable') or courier_id is not null),
  constraint postponed_needs_date
    check (status <> 'postponed' or delivery_date is not null)
);

-- 5) Items inside an order (one order can have several)
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_name text not null,
  size text,
  quantity int not null default 1 check (quantity > 0),
  price numeric(10, 2) not null default 0 check (price >= 0),
  created_at timestamptz not null default now()
);

-- 6) Order history (cannot be edited or deleted)
create table public.order_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete restrict,
  event text not null check (event in ('created', 'status_changed', 'reassigned')),
  old_status text,
  new_status text,
  old_courier_id uuid references public.couriers (id),
  new_courier_id uuid references public.couriers (id),
  reason_id uuid references public.reasons (id),
  new_delivery_date date,
  note text,
  actor_type text not null check (actor_type in ('admin', 'courier', 'system')),
  actor_id uuid,
  actor_name text,
  created_at timestamptz not null default now()
);

-- 7) Alerts for the admin (created when a courier changes a status)
create table public.alerts (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete restrict,
  courier_id uuid references public.couriers (id),
  kind text not null default 'status_changed' check (kind in ('status_changed')),
  old_status text,
  new_status text,
  reason_id uuid references public.reasons (id),
  note text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Speed for searching and filtering
create index orders_status_idx on public.orders (status);
create index orders_courier_status_idx on public.orders (courier_id, status);
create index orders_delivery_date_idx on public.orders (delivery_date);
create index orders_phone_idx on public.orders (customer_phone);
create index orders_name_idx on public.orders (lower(customer_name));
create index orders_area_idx on public.orders (area_id);
create index order_items_order_idx on public.order_items (order_id);
create index order_history_order_idx on public.order_history (order_id, created_at);
create index alerts_unread_idx on public.alerts (created_at) where read_at is null;

-- Automatic helpers ---------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- The order's COD total is recalculated whenever its items change
create function public.recalc_cod() returns trigger
language plpgsql set search_path = public as $$
declare v_order uuid;
begin
  v_order := coalesce(new.order_id, old.order_id);
  update public.orders
     set cod_amount = coalesce(
       (select sum(price * quantity) from public.order_items where order_id = v_order), 0)
   where id = v_order;
  return null;
end $$;

create trigger order_items_recalc
  after insert or update or delete on public.order_items
  for each row execute function public.recalc_cod();

-- Every new order gets a "created" line in its history
create function public.log_order_created() returns trigger
language plpgsql set search_path = public as $$
begin
  insert into public.order_history (order_id, event, new_status, new_courier_id, actor_type, actor_name)
  values (new.id, 'created', new.status, new.courier_id, 'admin', new.created_by);
  return new;
end $$;

create trigger orders_log_created after insert on public.orders
  for each row execute function public.log_order_created();

-- History can never be changed or deleted
create function public.block_history_changes() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'Order history cannot be changed or deleted';
end $$;

create trigger order_history_immutable before update or delete on public.order_history
  for each row execute function public.block_history_changes();

-- Change an order's status (the ONLY way statuses change) --------------------
-- Records who and when, checks the rules, and alerts the admin for courier changes.
create function public.change_order_status(
  p_order_id uuid,
  p_new_status text,
  p_actor_type text,
  p_actor_id uuid default null,
  p_actor_name text default null,
  p_reason_id uuid default null,
  p_note text default null,
  p_new_date date default null
) returns public.orders
language plpgsql set search_path = public as $$
declare
  v_order public.orders;
  v_old_status text;
  v_reason_kind text;
begin
  if p_actor_type not in ('admin', 'courier') then
    raise exception 'actor_type must be admin or courier';
  end if;
  if p_new_status not in ('new', 'assigned', 'out_for_delivery', 'delivered',
                          'postponed', 'returned', 'failed', 'unavailable') then
    raise exception 'invalid status: %', p_new_status;
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order not found';
  end if;
  v_old_status := v_order.status;

  if p_actor_type = 'courier' then
    if p_actor_id is null or v_order.courier_id is distinct from p_actor_id then
      raise exception 'this order is not assigned to this courier';
    end if;
    if v_old_status in ('delivered', 'returned', 'failed', 'unavailable') then
      raise exception 'this order is already closed';
    end if;
    if p_new_status not in ('out_for_delivery', 'delivered', 'postponed',
                            'returned', 'failed', 'unavailable') then
      raise exception 'courier cannot set this status';
    end if;
  end if;

  if p_new_status in ('returned', 'failed') then
    if p_reason_id is null then
      raise exception 'a reason is required for %', p_new_status;
    end if;
    select kind into v_reason_kind from public.reasons where id = p_reason_id;
    if v_reason_kind is distinct from p_new_status then
      raise exception 'the reason does not match the status';
    end if;
  end if;

  if p_new_status = 'postponed' and p_new_date is null then
    raise exception 'a new date is required to postpone an order';
  end if;

  if p_new_status not in ('new', 'unavailable') and v_order.courier_id is null then
    raise exception 'assign a courier first';
  end if;

  update public.orders
     set status = p_new_status,
         status_reason_id = case when p_new_status in ('returned', 'failed')
                                 then p_reason_id else null end,
         delivery_date = case
           when p_new_status = 'delivered'
             then (now() at time zone 'Africa/Cairo')::date
           when p_new_status = 'postponed' then p_new_date
           else coalesce(p_new_date, delivery_date) end
   where id = p_order_id
   returning * into v_order;

  insert into public.order_history
    (order_id, event, old_status, new_status, reason_id, new_delivery_date,
     note, actor_type, actor_id, actor_name)
  values
    (p_order_id, 'status_changed', v_old_status, p_new_status, v_order.status_reason_id,
     case when p_new_status = 'postponed' then p_new_date end,
     p_note, p_actor_type, p_actor_id, p_actor_name);

  if p_actor_type = 'courier' then
    insert into public.alerts (order_id, courier_id, old_status, new_status, reason_id, note)
    values (p_order_id, p_actor_id, v_old_status, p_new_status, v_order.status_reason_id, p_note);
  end if;

  return v_order;
end $$;

-- Assign or reassign an order to a courier (admin) ---------------------------
create function public.assign_order(
  p_order_id uuid,
  p_courier_id uuid,
  p_actor_name text default null,
  p_note text default null
) returns public.orders
language plpgsql set search_path = public as $$
declare
  v_order public.orders;
  v_old_status text;
  v_old_courier uuid;
begin
  if not exists (select 1 from public.couriers where id = p_courier_id and active) then
    raise exception 'courier not found or not active';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order not found';
  end if;
  if v_order.status in ('delivered', 'returned') then
    raise exception 'delivered or returned orders cannot be reassigned';
  end if;
  v_old_status := v_order.status;
  v_old_courier := v_order.courier_id;

  update public.orders
     set courier_id = p_courier_id,
         status = case when v_old_status = 'postponed' then 'postponed' else 'assigned' end,
         status_reason_id = case when v_old_status = 'postponed'
                                 then status_reason_id else null end
   where id = p_order_id
   returning * into v_order;

  insert into public.order_history
    (order_id, event, old_status, new_status, old_courier_id, new_courier_id,
     note, actor_type, actor_name)
  values
    (p_order_id, 'reassigned', v_old_status, v_order.status, v_old_courier, p_courier_id,
     p_note, 'admin', p_actor_name);

  return v_order;
end $$;

-- Starter reasons (you can edit these later) ---------------------------------
insert into public.reasons (kind, name_ar, name_en, sort_order) values
  ('failed',   'العميل لا يرد',              'Customer not answering',        1),
  ('failed',   'العنوان غير واضح أو خاطئ',    'Address unclear or wrong',      2),
  ('failed',   'العميل رفض الاستلام',         'Customer refused the order',    3),
  ('failed',   'العميل ألغى الطلب',           'Customer cancelled the order',  4),
  ('failed',   'العميل غير موجود في العنوان', 'Customer not at the address',   5),
  ('failed',   'سبب آخر',                    'Other reason',                  6),
  ('returned', 'المقاس غير مناسب',            'Wrong size',                    1),
  ('returned', 'العميل غيّر رأيه',            'Customer changed their mind',   2),
  ('returned', 'عيب في المنتج',               'Product defect',                3),
  ('returned', 'المنتج مختلف عن الصور',       'Different from the photos',     4),
  ('returned', 'سبب آخر',                    'Other reason',                  5);

-- Security: nobody can read or write directly with the public keys.
-- The app talks to the database only from its own secure server.
alter table public.areas         enable row level security;
alter table public.couriers      enable row level security;
alter table public.reasons       enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.order_history enable row level security;
alter table public.alerts        enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

revoke all on function public.change_order_status(uuid, text, text, uuid, text, uuid, text, date)
  from public, anon, authenticated;
revoke all on function public.assign_order(uuid, uuid, text, text)
  from public, anon, authenticated;
