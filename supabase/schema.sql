-- ===========================================================================
-- AppRemi - Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar en Supabase > SQL Editor (o como migración).
-- Regla de negocio: % chofer configurable por chofer (default 67%),
--   resto dueño, diezmo 10% de la parte del dueño.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Tablas de dominio
-- ---------------------------------------------------------------------------

create table if not exists chofer (
  id          bigint generated always as identity primary key,
  nombre      text not null,
  apellido    text,
  telefono    text,
  activo      boolean not null default true,
  pct_chofer  numeric(5,4) not null default 0.6700
                check (pct_chofer > 0 and pct_chofer < 1),
  user_id     uuid references auth.users (id) on delete set null,
  creado_en   timestamptz not null default now()
);

create table if not exists vehiculo (
  id         bigint generated always as identity primary key,
  movil      text not null,
  marca      text,
  modelo     text,
  patente    text,
  chofer_id  bigint references chofer (id) on delete set null
);

create table if not exists turno (
  id             bigint generated always as identity primary key,
  chofer_id      bigint not null references chofer (id) on delete cascade,
  vehiculo_id    bigint references vehiculo (id) on delete set null,
  fecha          date not null,
  tipo           text not null check (tipo in ('manana','tarde','noche','dia')),
  hora_inicio    text,
  hora_fin       text,
  km_libres      numeric(12,2) not null default 0,
  km_ocupados    numeric(12,2) not null default 0,
  cantidad_viajes integer not null default 0,
  recaudacion    numeric(12,2) not null default 0,
  pactado        numeric(12,2),
  efectivo       numeric(12,2) not null default 0,
  transferencia  numeric(12,2) not null default 0,
  bonos          numeric(12,2) not null default 0,
  creado_en      timestamptz not null default now()
);

create index if not exists turno_fecha_idx on turno (fecha desc);
create index if not exists turno_chofer_idx on turno (chofer_id);

create table if not exists gasto (
  id              bigint generated always as identity primary key,
  turno_id        bigint not null references turno (id) on delete cascade,
  categoria       text not null check (categoria in
                    ('combustible','gomeria','peajes','lavadero','mecanica','pinchadura','otros')),
  monto           numeric(12,2) not null default 0,
  litros          numeric(10,2),
  numero_ticket   text,
  comprobante_url text,
  detalle         text,
  creado_en       timestamptz not null default now()
);

create index if not exists gasto_turno_idx on gasto (turno_id);

create table if not exists asistencia (
  id          bigint generated always as identity primary key,
  chofer_id   bigint not null references chofer (id) on delete cascade,
  fecha       date not null,
  asis1       boolean not null default false,
  asis2       boolean not null default false,
  asis1_hora  text,
  asis2_hora  text,
  unique (chofer_id, fecha)
);

-- ---------------------------------------------------------------------------
-- Migraciones idempotentes
-- Si las tablas ya existian (create table if not exists no agrega columnas),
-- estas sentencias agregan lo que falte. Es seguro re-ejecutarlas.
-- ---------------------------------------------------------------------------

alter table chofer add column if not exists pct_chofer   numeric(5,4) not null default 0.6700;
alter table turno  add column if not exists pactado       numeric(12,2);
alter table turno  add column if not exists efectivo      numeric(12,2) not null default 0;
alter table turno  add column if not exists transferencia numeric(12,2) not null default 0;
alter table turno  add column if not exists bonos         numeric(12,2) not null default 0;

-- Asegura el check de rango de pct_chofer.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.chofer'::regclass
      and conname = 'chofer_pct_chofer_check'
  ) then
    alter table public.chofer
      add constraint chofer_pct_chofer_check check (pct_chofer > 0 and pct_chofer < 1);
  end if;
end $$;

-- Actualiza el check de categorias de gasto para incluir 'gomeria'.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.gasto'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%categoria%'
  loop
    execute format('alter table public.gasto drop constraint %I', c.conname);
  end loop;
  alter table public.gasto
    add constraint gasto_categoria_check check (categoria in
      ('combustible','gomeria','peajes','lavadero','mecanica','pinchadura','otros'));
end $$;

-- ---------------------------------------------------------------------------
-- Perfil / rol del usuario autenticado
-- ---------------------------------------------------------------------------

create table if not exists perfil (
  id         uuid primary key references auth.users (id) on delete cascade,
  rol        text not null default 'chofer' check (rol in ('chofer','duenio')),
  chofer_id  bigint references chofer (id) on delete set null,
  nombre     text,
  email      text,
  creado_en  timestamptz not null default now()
);

-- Migracion: si la tabla ya existia sin la columna email.
alter table perfil add column if not exists email text;

-- Crea el perfil automaticamente cuando se registra un usuario nuevo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfil (id, rol, nombre, email)
  values (new.id, 'chofer', coalesce(new.email, ''), new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table chofer     enable row level security;
alter table vehiculo   enable row level security;
alter table turno      enable row level security;
alter table gasto      enable row level security;
alter table asistencia enable row level security;
alter table perfil     enable row level security;

-- Helper: ¿el usuario actual es dueño?
create or replace function public.es_duenio()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfil p
    where p.id = auth.uid() and p.rol = 'duenio'
  );
$$;

-- Helper: id de chofer del usuario actual (null si es dueño / sin vínculo)
create or replace function public.mi_chofer_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select p.chofer_id from public.perfil p where p.id = auth.uid();
$$;

-- Lectura: cualquier usuario autenticado puede leer.
drop policy if exists "lectura_autenticados_chofer"     on chofer;
drop policy if exists "lectura_autenticados_vehiculo"   on vehiculo;
drop policy if exists "lectura_autenticados_turno"      on turno;
drop policy if exists "lectura_autenticados_gasto"      on gasto;
drop policy if exists "lectura_autenticados_asistencia" on asistencia;
drop policy if exists "lectura_propio_perfil"           on perfil;
drop policy if exists "gestion_perfil_duenio"           on perfil;
drop policy if exists "escritura_turno_duenio"          on turno;
drop policy if exists "escritura_turno_chofer"          on turno;
drop policy if exists "escritura_gasto_duenio"          on gasto;
drop policy if exists "escritura_gasto_chofer"          on gasto;
drop policy if exists "gestion_chofer"                  on chofer;
drop policy if exists "gestion_vehiculo"                on vehiculo;

create policy "lectura_autenticados_chofer"     on chofer     for select to authenticated using (true);
create policy "lectura_autenticados_vehiculo"   on vehiculo   for select to authenticated using (true);
create policy "lectura_autenticados_turno"      on turno      for select to authenticated using (true);
create policy "lectura_autenticados_gasto"      on gasto      for select to authenticated using (true);
create policy "lectura_autenticados_asistencia" on asistencia for select to authenticated using (true);
create policy "lectura_propio_perfil"           on perfil     for select to authenticated using (id = auth.uid() or public.es_duenio());

-- Gestión de perfiles (roles y vínculo con chofer): solo dueño.
create policy "gestion_perfil_duenio" on perfil for update to authenticated
  using (public.es_duenio()) with check (public.es_duenio());

-- Escritura de turnos: el dueño puede todo; el chofer solo los propios.
create policy "escritura_turno_duenio" on turno for all to authenticated
  using (public.es_duenio()) with check (public.es_duenio());
create policy "escritura_turno_chofer" on turno for insert to authenticated
  with check (chofer_id = public.mi_chofer_id());

-- Escritura de gastos: dueño todo; chofer solo los de sus turnos.
create policy "escritura_gasto_duenio" on gasto for all to authenticated
  using (public.es_duenio()) with check (public.es_duenio());
create policy "escritura_gasto_chofer" on gasto for insert to authenticated
  with check (exists (
    select 1 from turno t
    where t.id = gasto.turno_id and t.chofer_id = public.mi_chofer_id()
  ));

-- Gestión de personal/vehículos: solo dueño.
create policy "gestion_chofer"   on chofer   for all to authenticated using (public.es_duenio()) with check (public.es_duenio());
create policy "gestion_vehiculo" on vehiculo for all to authenticated using (public.es_duenio()) with check (public.es_duenio());

-- ---------------------------------------------------------------------------
-- Puesta en marcha
-- ---------------------------------------------------------------------------

-- Backfill del email en perfiles existentes (si la columna se agregó después).
update perfil p
set email = u.email
from auth.users u
where u.id = p.id and (p.email is null or p.email = '');

-- Crea perfiles faltantes para usuarios que existían antes del trigger.
insert into perfil (id, rol, nombre, email)
select u.id, 'chofer', coalesce(u.email, ''), u.email
from auth.users u
left join perfil p on p.id = u.id
where p.id is null;

-- El PRIMER dueño debe marcarse a mano (una sola vez). Reemplazá el email:
--   update perfil set rol = 'duenio'
--   where id = (select id from auth.users where email = 'dueno@ejemplo.com');
-- Después ya se administra todo desde la pantalla "Equipo" en la app.
