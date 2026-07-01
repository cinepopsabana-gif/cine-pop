-- ============================================================
-- CINE POP - Esquema de base de datos para Supabase
-- ============================================================
-- Instrucciones: copia TODO este archivo y pégalo en
-- Supabase -> SQL Editor -> New Query -> Run
-- ============================================================

-- Extensión necesaria para generar UUIDs
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. PELÍCULAS
-- ------------------------------------------------------------
create table if not exists movies (
  id text primary key,
  title text not null,
  description text not null default '',
  genre jsonb not null default '[]'::jsonb,
  duration text not null default '',
  rating text not null default '',
  formats jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  poster_url text not null default '',
  rating_score numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. FUNCIONES / HORARIOS (showtimes), ligadas a una película
-- ------------------------------------------------------------
create table if not exists showtimes (
  id text primary key,
  movie_id text not null references movies(id) on delete cascade,
  time text not null,
  cinema text not null,
  date text not null,
  price_standard numeric not null default 0,
  price_vip numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_showtimes_movie_id on showtimes(movie_id);

-- ------------------------------------------------------------
-- 3. ASIENTOS OCUPADOS (vendido / apartado) por función
-- ------------------------------------------------------------
create table if not exists occupied_seats (
  showtime_id text not null references showtimes(id) on delete cascade,
  seat_id text not null,
  status text not null check (status in ('vendido', 'apartado')),
  created_at timestamptz not null default now(),
  primary key (showtime_id, seat_id)
);

-- ------------------------------------------------------------
-- 4. PRODUCTOS DE DULCERÍA
-- ------------------------------------------------------------
create table if not exists snack_items (
  id text primary key,
  name text not null,
  description text not null default '',
  price numeric not null default 0,
  category text not null check (category in ('Combos', 'Individual', 'Drinks', 'Sweets')),
  image_url text not null default '',
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. CÓDIGOS DE PROMOCIÓN
-- ------------------------------------------------------------
create table if not exists promo_codes (
  id text primary key,
  code text not null unique,
  description text not null default '',
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  discount_value numeric not null default 0,
  minimum_purchase numeric not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6. HISTORIAL DE VENTAS
-- ------------------------------------------------------------
create table if not exists sales_history (
  id text primary key,
  date text not null,
  movie_title text not null,
  showtime_time text not null,
  showtime_cinema text not null,
  showtime_date text not null,
  seats jsonb not null default '[]'::jsonb,
  snacks jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  payment_method text not null check (payment_method in ('transfer', 'cash')),
  customer_doc text,
  customer_phone text,
  bank_name text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. GASTOS
-- ------------------------------------------------------------
create table if not exists expenses (
  id text primary key,
  date text not null,
  category text not null check (category in ('Servicios', 'Personal', 'Limpieza', 'Mantenimiento', 'Insumos', 'Otros')),
  description text not null default '',
  amount numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FUNCIÓN CRÍTICA: confirmar compra de forma atómica
-- ============================================================
-- Esta función evita que dos personas compren el mismo asiento
-- al mismo tiempo. Revisa y reserva los asientos en una sola
-- transacción indivisible (todo o nada).
-- ============================================================
create or replace function confirm_purchase(
  p_showtime_id text,
  p_seat_ids text[],
  p_sale jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_conflict text;
begin
  -- Bloquea las filas de este showtime para evitar carreras entre transacciones simultáneas
  perform 1 from occupied_seats
    where showtime_id = p_showtime_id and seat_id = any(p_seat_ids)
    for update;

  -- Verifica si alguno de los asientos solicitados ya está ocupado
  select seat_id into v_conflict
  from occupied_seats
  where showtime_id = p_showtime_id
    and seat_id = any(p_seat_ids)
  limit 1;

  if v_conflict is not null then
    return jsonb_build_object(
      'success', false,
      'error', 'seat_taken',
      'seat_id', v_conflict
    );
  end if;

  -- Inserta los asientos como vendidos
  insert into occupied_seats (showtime_id, seat_id, status)
  select p_showtime_id, unnest(p_seat_ids), 'vendido';

  -- Inserta el registro de venta
  insert into sales_history (
    id, date, movie_title, showtime_time, showtime_cinema, showtime_date,
    seats, snacks, subtotal, discount, total, payment_method,
    customer_doc, customer_phone, bank_name
  )
  select
    p_sale->>'id',
    p_sale->>'date',
    p_sale->>'movieTitle',
    p_sale->>'showtimeTime',
    p_sale->>'showtimeCinema',
    p_sale->>'showtimeDate',
    p_sale->'seats',
    p_sale->'snacks',
    (p_sale->>'subtotal')::numeric,
    (p_sale->>'discount')::numeric,
    (p_sale->>'total')::numeric,
    p_sale->>'paymentMethod',
    p_sale->>'customerDoc',
    p_sale->>'customerPhone',
    p_sale->>'bankName';

  return jsonb_build_object('success', true);
end;
$$;

-- ============================================================
-- SEGURIDAD (Row Level Security)
-- ============================================================
-- Esta app no tiene login de clientes: cualquier visitante puede
-- leer y comprar, y el panel admin se protege solo con la URL
-- #admin (sin contraseña real). Por eso aquí se habilita acceso
-- público de lectura/escritura. Si más adelante quieres proteger
-- el panel admin con una contraseña real, se puede mejorar esto.
-- ============================================================
alter table movies enable row level security;
alter table showtimes enable row level security;
alter table occupied_seats enable row level security;
alter table snack_items enable row level security;
alter table promo_codes enable row level security;
alter table sales_history enable row level security;
alter table expenses enable row level security;

create policy "public read movies" on movies for select using (true);
create policy "public write movies" on movies for insert with check (true);
create policy "public update movies" on movies for update using (true);
create policy "public delete movies" on movies for delete using (true);

create policy "public read showtimes" on showtimes for select using (true);
create policy "public write showtimes" on showtimes for insert with check (true);
create policy "public update showtimes" on showtimes for update using (true);
create policy "public delete showtimes" on showtimes for delete using (true);

create policy "public read occupied_seats" on occupied_seats for select using (true);
create policy "public write occupied_seats" on occupied_seats for insert with check (true);
create policy "public update occupied_seats" on occupied_seats for update using (true);
create policy "public delete occupied_seats" on occupied_seats for delete using (true);

create policy "public read snack_items" on snack_items for select using (true);
create policy "public write snack_items" on snack_items for insert with check (true);
create policy "public update snack_items" on snack_items for update using (true);
create policy "public delete snack_items" on snack_items for delete using (true);

create policy "public read promo_codes" on promo_codes for select using (true);
create policy "public write promo_codes" on promo_codes for insert with check (true);
create policy "public update promo_codes" on promo_codes for update using (true);
create policy "public delete promo_codes" on promo_codes for delete using (true);

create policy "public read sales_history" on sales_history for select using (true);
create policy "public write sales_history" on sales_history for insert with check (true);
create policy "public update sales_history" on sales_history for update using (true);
create policy "public delete sales_history" on sales_history for delete using (true);

create policy "public read expenses" on expenses for select using (true);
create policy "public write expenses" on expenses for insert with check (true);
create policy "public update expenses" on expenses for update using (true);
create policy "public delete expenses" on expenses for delete using (true);

-- ============================================================
-- HABILITAR TIEMPO REAL (para que varias cajas vean cambios al instante)
-- ============================================================
alter publication supabase_realtime add table occupied_seats;
alter publication supabase_realtime add table sales_history;
alter publication supabase_realtime add table movies;
alter publication supabase_realtime add table showtimes;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
