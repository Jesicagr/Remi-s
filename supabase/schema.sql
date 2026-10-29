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
drop policy if exists "insercion_turno_duenio"          on turno;
drop policy if exists "insercion_turno_chofer"          on turno;
drop policy if exists "insercion_gasto_duenio"          on gasto;
drop policy if exists "insercion_gasto_chofer"          on gasto;
drop policy if exists "insercion_chofer"                on chofer;
drop policy if exists "actualizacion_chofer"            on chofer;
drop policy if exists "insercion_vehiculo"              on vehiculo;
drop policy if exists "actualizacion_vehiculo"          on vehiculo;

create policy "lectura_autenticados_chofer"     on chofer     for select to authenticated using (true);
create policy "lectura_autenticados_vehiculo"   on vehiculo   for select to authenticated using (true);
create policy "lectura_autenticados_turno"      on turno      for select to authenticated using (true);
create policy "lectura_autenticados_gasto"      on gasto      for select to authenticated using (true);
create policy "lectura_autenticados_asistencia" on asistencia for select to authenticated using (true);
create policy "lectura_propio_perfil"           on perfil     for select to authenticated using (id = auth.uid() or public.es_duenio());

-- Gestión de perfiles (roles y vínculo con chofer): solo dueño.
create policy "gestion_perfil_duenio" on perfil for update to authenticated
  using (public.es_duenio()) with check (public.es_duenio());

-- Registro de turnos: SOLO INSERT. No hay UPDATE ni DELETE para nadie.
-- Una corrección se registra en la tabla `correccion` (ver más abajo).
create policy "insercion_turno_duenio" on turno for insert to authenticated
  with check (public.es_duenio());
create policy "insercion_turno_chofer" on turno for insert to authenticated
  with check (chofer_id = public.mi_chofer_id());

-- Registro de gastos: SOLO INSERT.
create policy "insercion_gasto_duenio" on gasto for insert to authenticated
  with check (public.es_duenio());
create policy "insercion_gasto_chofer" on gasto for insert to authenticated
  with check (exists (
    select 1 from turno t
    where t.id = gasto.turno_id and t.chofer_id = public.mi_chofer_id()
  ));

-- Datos maestros: se pueden crear y actualizar, pero NO borrar.
-- El borrado se reemplaza por `activo = false`.
create policy "insercion_chofer"       on chofer   for insert to authenticated with check (public.es_duenio());
create policy "actualizacion_chofer"   on chofer   for update to authenticated using (public.es_duenio()) with check (public.es_duenio());
create policy "insercion_vehiculo"     on vehiculo for insert to authenticated with check (public.es_duenio());
create policy "actualizacion_vehiculo" on vehiculo for update to authenticated using (public.es_duenio()) with check (public.es_duenio());

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

-- ===========================================================================
-- REGISTRO INMUTABLE / EVIDENCIA DE TRABAJO
-- A partir de acá, los turnos y gastos son append-only:
--   - No se pueden UPDATE ni DELETE (ni siquiera el dueño).
--   - Las correcciones se registran en `correccion` con motivo obligatorio.
--   - Los reportes ignoran los registros anulados.
-- Ejecutá este archivo completo otra vez para aplicar la migración.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) Snapshot de las reglas de negocio en cada turno
--    Si cambia el % del chofer mañana, las liquidaciones viejas no cambian.
-- ---------------------------------------------------------------------------

alter table public.turno add column if not exists pct_chofer      numeric(5,4);
alter table public.turno add column if not exists pct_diezmo      numeric(5,4) not null default 0.1000;
alter table public.turno add column if not exists registrado_por uuid;
alter table public.gasto add column if not exists registrado_por uuid;
alter table public.vehiculo add column if not exists activo boolean not null default true;

update public.turno t
set pct_chofer = coalesce(
  (select c.pct_chofer from public.chofer c where c.id = t.chofer_id),
  0.6700
)
where t.pct_chofer is null;

alter table public.turno alter column pct_chofer set default 0.6700;
alter table public.turno alter column pct_chofer set not null;
alter table public.turno alter column registrado_por set default auth.uid();
alter table public.gasto alter column registrado_por set default auth.uid();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.turno'::regclass
      and conname = 'turno_pct_chofer_check'
  ) then
    alter table public.turno
      add constraint turno_pct_chofer_check check (pct_chofer > 0 and pct_chofer < 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.turno'::regclass
      and conname = 'turno_pct_diezmo_check'
  ) then
    alter table public.turno
      add constraint turno_pct_diezmo_check check (pct_diezmo >= 0 and pct_diezmo < 1);
  end if;
end $$;

-- Completa el snapshot y el autor en cada INSERT, sin confiar en el cliente.
create or replace function public.preparar_turno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pct numeric(5,4);
begin
  select c.pct_chofer into v_pct
  from public.chofer c
  where c.id = new.chofer_id;

  if v_pct is null then
    raise exception 'El chofer % no existe', new.chofer_id;
  end if;

  new.pct_chofer := v_pct;
  new.pct_diezmo := coalesce(new.pct_diezmo, 0.1000);
  new.registrado_por := coalesce(new.registrado_por, auth.uid());

  if new.fecha > current_date then
    raise exception 'No se pueden cargar turnos con fecha futura';
  end if;

  return new;
end;
$$;

drop trigger if exists turno_preparar on public.turno;
create trigger turno_preparar
  before insert on public.turno
  for each row execute function public.preparar_turno();

-- ---------------------------------------------------------------------------
-- 2) Inmutabilidad: bloquea UPDATE / DELETE / TRUNCATE
-- ---------------------------------------------------------------------------

create or replace function public.bloquear_modificacion()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'El registro de % es inmutable. Registrá una corrección con motivo.', TG_TABLE_NAME;
end;
$$;

drop trigger if exists turno_inmutable on public.turno;
create trigger turno_inmutable
  before update or delete on public.turno
  for each row execute function public.bloquear_modificacion();
drop trigger if exists turno_no_truncate on public.turno;
create trigger turno_no_truncate
  before truncate on public.turno
  for each statement execute function public.bloquear_modificacion();

drop trigger if exists gasto_inmutable on public.gasto;
create trigger gasto_inmutable
  before update or delete on public.gasto
  for each row execute function public.bloquear_modificacion();
drop trigger if exists gasto_no_truncate on public.gasto;
create trigger gasto_no_truncate
  before truncate on public.gasto
  for each statement execute function public.bloquear_modificacion();

-- ---------------------------------------------------------------------------
-- 2b) Alta atomica de turno + gastos
--     Evita que quede un turno sin sus gastos si falla una insercion.
--     La funcion corre con los permisos del usuario (RLS sigue aplicando).
-- ---------------------------------------------------------------------------

create or replace function public.registrar_turno(
  p_turno jsonb,
  p_gastos jsonb default '[]'::jsonb
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_turno_id bigint;
begin
  insert into public.turno (
    chofer_id, vehiculo_id, fecha, tipo, hora_inicio, hora_fin,
    km_libres, km_ocupados, cantidad_viajes, recaudacion, pactado,
    efectivo, transferencia, bonos
  ) values (
    (p_turno->>'chofer_id')::bigint,
    nullif(p_turno->>'vehiculo_id', '')::bigint,
    (p_turno->>'fecha')::date,
    p_turno->>'tipo',
    nullif(p_turno->>'hora_inicio', ''),
    nullif(p_turno->>'hora_fin', ''),
    coalesce((p_turno->>'km_libres')::numeric, 0),
    coalesce((p_turno->>'km_ocupados')::numeric, 0),
    coalesce((p_turno->>'cantidad_viajes')::integer, 0),
    coalesce((p_turno->>'recaudacion')::numeric, 0),
    nullif(p_turno->>'pactado', '')::numeric,
    coalesce((p_turno->>'efectivo')::numeric, 0),
    coalesce((p_turno->>'transferencia')::numeric, 0),
    coalesce((p_turno->>'bonos')::numeric, 0)
  )
  returning id into v_turno_id;

  if p_gastos is not null
     and jsonb_typeof(p_gastos) = 'array'
     and jsonb_array_length(p_gastos) > 0 then
    insert into public.gasto (
      turno_id, categoria, monto, litros, numero_ticket, detalle
    )
    select
      v_turno_id,
      g->>'categoria',
      coalesce((g->>'monto')::numeric, 0),
      nullif(g->>'litros', '')::numeric,
      nullif(g->>'numero_ticket', ''),
      nullif(g->>'detalle', '')
    from jsonb_array_elements(p_gastos) as g;
  end if;

  return v_turno_id;
end;
$$;

revoke all on function public.registrar_turno(jsonb, jsonb) from public;
grant execute on function public.registrar_turno(jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Correcciones / anulaciones (append-only, con motivo y autor)
-- ---------------------------------------------------------------------------

create table if not exists public.correccion (
  id           bigint generated always as identity primary key,
  tabla        text not null check (tabla in ('turno','gasto','asistencia')),
  registro_id  bigint not null,
  tipo         text not null check (tipo in ('anulacion','ajuste')),
  motivo       text not null check (length(trim(motivo)) > 0),
  datos        jsonb,
  creado_por   uuid not null default auth.uid() references auth.users (id),
  creado_en    timestamptz not null default now()
);

create index if not exists correccion_registro_idx
  on public.correccion (tabla, registro_id);

-- Un registro solo puede anularse una vez (evita doble anulación concurrente).
create unique index if not exists correccion_anulacion_unica
  on public.correccion (tabla, registro_id)
  where tipo = 'anulacion';

drop trigger if exists correccion_inmutable on public.correccion;
create trigger correccion_inmutable
  before update or delete on public.correccion
  for each row execute function public.bloquear_modificacion();
drop trigger if exists correccion_no_truncate on public.correccion;
create trigger correccion_no_truncate
  before truncate on public.correccion
  for each statement execute function public.bloquear_modificacion();

-- ---------------------------------------------------------------------------
-- 3b) Asistencia como marcas inmutables
--     Una fila por marca (asis1/asis2), no un registro que se reescribe.
-- ---------------------------------------------------------------------------

create table if not exists public.marca_asistencia (
  id             bigint generated always as identity primary key,
  chofer_id      bigint not null references public.chofer (id) on delete restrict,
  turno_id       bigint references public.turno (id) on delete restrict,
  fecha          date not null,
  tipo           text not null check (tipo in ('asis1','asis2')),
  hora           text,
  origen         text not null default 'turno'
                   check (origen in ('turno','manual','migracion')),
  registrado_por uuid default auth.uid() references auth.users (id),
  creado_en      timestamptz not null default now(),
  unique (chofer_id, fecha, tipo)
);

create index if not exists marca_asistencia_fecha_idx
  on public.marca_asistencia (fecha desc, chofer_id);

-- Migra la tabla vieja (idempotente). Las filas con asis1/asis2 pasan a marcas.
insert into public.marca_asistencia
  (chofer_id, fecha, tipo, hora, origen, creado_en)
select chofer_id, fecha, 'asis1', asis1_hora, 'migracion', now()
from public.asistencia
where asis1
on conflict (chofer_id, fecha, tipo) do nothing;

insert into public.marca_asistencia
  (chofer_id, fecha, tipo, hora, origen, creado_en)
select chofer_id, fecha, 'asis2', asis2_hora, 'migracion', now()
from public.asistencia
where asis2
on conflict (chofer_id, fecha, tipo) do nothing;

drop trigger if exists marca_asistencia_inmutable on public.marca_asistencia;
create trigger marca_asistencia_inmutable
  before update or delete on public.marca_asistencia
  for each row execute function public.bloquear_modificacion();
drop trigger if exists marca_asistencia_no_truncate on public.marca_asistencia;
create trigger marca_asistencia_no_truncate
  before truncate on public.marca_asistencia
  for each statement execute function public.bloquear_modificacion();

-- La tabla vieja queda como histórico de solo lectura.
drop trigger if exists asistencia_inmutable on public.asistencia;
create trigger asistencia_inmutable
  before update or delete on public.asistencia
  for each row execute function public.bloquear_modificacion();
drop trigger if exists asistencia_no_truncate on public.asistencia;
create trigger asistencia_no_truncate
  before truncate on public.asistencia
  for each statement execute function public.bloquear_modificacion();

-- ---------------------------------------------------------------------------
-- 4) Evidencias (fotos de tablero, tickets, comprobantes, firmas)
--    El archivo va a Storage; acá queda el hash y los metadatos.
-- ---------------------------------------------------------------------------

create table if not exists public.evidencia (
  id             bigint generated always as identity primary key,
  turno_id       bigint references public.turno (id) on delete restrict,
  gasto_id       bigint references public.gasto (id) on delete restrict,
  tipo           text not null check (tipo in
                   ('foto_tablero','ticket','comprobante','firma','otro')),
  storage_path   text not null unique,
  nombre_archivo text,
  descripcion    text,
  mime_type      text,
  tamano_bytes   bigint,
  sha256         text,
  capturado_en   timestamptz not null default now(),
  registrado_por uuid default auth.uid() references auth.users (id),
  creado_en      timestamptz not null default now(),
  constraint evidencia_destino_check check (num_nonnulls(turno_id, gasto_id) >= 1)
);

alter table public.evidencia add column if not exists nombre_archivo text;
alter table public.evidencia add column if not exists descripcion text;

create index if not exists evidencia_turno_idx on public.evidencia (turno_id);
create index if not exists evidencia_gasto_idx on public.evidencia (gasto_id);

drop trigger if exists evidencia_inmutable on public.evidencia;
create trigger evidencia_inmutable
  before update or delete on public.evidencia
  for each row execute function public.bloquear_modificacion();
drop trigger if exists evidencia_no_truncate on public.evidencia;
create trigger evidencia_no_truncate
  before truncate on public.evidencia
  for each statement execute function public.bloquear_modificacion();

-- Bucket privado. El acceso se hace con URLs firmadas desde el servidor.
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;

-- El primer segmento del path es el id del turno: "123/uuid-foto.jpg".
create or replace function public.turno_id_de_evidencia(p_name text)
returns bigint
language sql
immutable
set search_path = public
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9]+$'
    then split_part(p_name, '/', 1)::bigint
    else null
  end;
$$;

drop policy if exists "evidencias_lectura" on storage.objects;
create policy "evidencias_lectura" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evidencias'
    and (
      public.es_duenio()
      or exists (
        select 1 from public.turno t
        where t.id = public.turno_id_de_evidencia(name)
          and t.chofer_id = public.mi_chofer_id()
      )
    )
  );

drop policy if exists "evidencias_carga" on storage.objects;
create policy "evidencias_carga" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evidencias'
    and (
      public.es_duenio()
      or exists (
        select 1 from public.turno t
        where t.id = public.turno_id_de_evidencia(name)
          and t.chofer_id = public.mi_chofer_id()
      )
    )
  );

-- Sin políticas de UPDATE/DELETE: los objetos cargados no se pueden alterar
-- desde la app. Para correcciones reales, subí un archivo nuevo.

-- ---------------------------------------------------------------------------
-- 5) Cierre de períodos: no se cargan registros nuevos en meses cerrados
-- ---------------------------------------------------------------------------

create table if not exists public.periodo_cerrado (
  mes          date primary key check (extract(day from mes) = 1),
  cerrado_por  uuid default auth.uid() references auth.users (id),
  cerrado_en   timestamptz not null default now(),
  motivo       text
);

create or replace function public.validar_periodo_abierto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fecha date;
begin
  if TG_TABLE_NAME = 'turno' then
    v_fecha := new.fecha;
  else
    select t.fecha into v_fecha from public.turno t where t.id = new.turno_id;
  end if;

  if v_fecha is null then
    raise exception 'No se pudo determinar la fecha del registro';
  end if;

  if exists (
    select 1 from public.periodo_cerrado p
    where p.mes = date_trunc('month', v_fecha)::date
  ) then
    raise exception 'El período % está cerrado; no se pueden cargar registros.', to_char(v_fecha, 'YYYY-MM');
  end if;

  return new;
end;
$$;

drop trigger if exists turno_periodo_abierto on public.turno;
create trigger turno_periodo_abierto
  before insert on public.turno
  for each row execute function public.validar_periodo_abierto();

drop trigger if exists gasto_periodo_abierto on public.gasto;
create trigger gasto_periodo_abierto
  before insert on public.gasto
  for each row execute function public.validar_periodo_abierto();

-- ---------------------------------------------------------------------------
-- 6) Auditoría de datos maestros (choferes, vehículos, perfiles)
--    Los cambios de % y de roles quedan registrados con autor y fecha.
-- ---------------------------------------------------------------------------

create table if not exists public.auditoria (
  id                bigint generated always as identity primary key,
  tabla             text not null,
  registro_id       text not null,
  accion            text not null check (accion in ('insert','update','delete')),
  datos_anteriores  jsonb,
  datos_nuevos      jsonb,
  usuario           uuid default auth.uid() references auth.users (id),
  creado_en         timestamptz not null default now()
);

create index if not exists auditoria_tabla_idx
  on public.auditoria (tabla, registro_id, creado_en desc);

create or replace function public.auditar_cambio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    text;
  v_old   jsonb;
  v_new   jsonb;
begin
  if TG_OP = 'DELETE' then
    v_id := old.id::text;
    v_old := to_jsonb(old);
  elsif TG_OP = 'UPDATE' then
    v_id := new.id::text;
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
  else
    v_id := new.id::text;
    v_new := to_jsonb(new);
  end if;

  insert into public.auditoria
    (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario)
  values
    (TG_TABLE_NAME, v_id, lower(TG_OP), v_old, v_new, auth.uid());

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists chofer_auditoria on public.chofer;
create trigger chofer_auditoria
  after insert or update or delete on public.chofer
  for each row execute function public.auditar_cambio();

drop trigger if exists vehiculo_auditoria on public.vehiculo;
create trigger vehiculo_auditoria
  after insert or update or delete on public.vehiculo
  for each row execute function public.auditar_cambio();

drop trigger if exists perfil_auditoria on public.perfil;
create trigger perfil_auditoria
  after insert or update or delete on public.perfil
  for each row execute function public.auditar_cambio();

drop trigger if exists auditoria_inmutable on public.auditoria;
create trigger auditoria_inmutable
  before update or delete on public.auditoria
  for each row execute function public.bloquear_modificacion();
drop trigger if exists auditoria_no_truncate on public.auditoria;
create trigger auditoria_no_truncate
  before truncate on public.auditoria
  for each statement execute function public.bloquear_modificacion();

-- ---------------------------------------------------------------------------
-- 7) Integridad referencial: un borrado accidental no puede arrastrar evidencia
-- ---------------------------------------------------------------------------

do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.turno'::regclass
      and contype = 'f'
      and confrelid = 'public.chofer'::regclass
  loop
    execute format('alter table public.turno drop constraint %I', c.conname);
  end loop;
  alter table public.turno
    add constraint turno_chofer_id_fkey
    foreign key (chofer_id) references public.chofer (id) on delete restrict;

  for c in
    select conname from pg_constraint
    where conrelid = 'public.gasto'::regclass
      and contype = 'f'
      and confrelid = 'public.turno'::regclass
  loop
    execute format('alter table public.gasto drop constraint %I', c.conname);
  end loop;
  alter table public.gasto
    add constraint gasto_turno_id_fkey
    foreign key (turno_id) references public.turno (id) on delete restrict;

  for c in
    select conname from pg_constraint
    where conrelid = 'public.asistencia'::regclass
      and contype = 'f'
      and confrelid = 'public.chofer'::regclass
  loop
    execute format('alter table public.asistencia drop constraint %I', c.conname);
  end loop;
  alter table public.asistencia
    add constraint asistencia_chofer_id_fkey
    foreign key (chofer_id) references public.chofer (id) on delete restrict;
end $$;

-- ---------------------------------------------------------------------------
-- 8) RLS de las tablas nuevas
-- ---------------------------------------------------------------------------

alter table public.correccion       enable row level security;
alter table public.evidencia        enable row level security;
alter table public.marca_asistencia enable row level security;
alter table public.periodo_cerrado  enable row level security;
alter table public.auditoria        enable row level security;

drop policy if exists "lectura_correccion"            on public.correccion;
drop policy if exists "insercion_correccion_duenio"    on public.correccion;
drop policy if exists "lectura_evidencia"              on public.evidencia;
drop policy if exists "insercion_evidencia"            on public.evidencia;
drop policy if exists "lectura_marca_asistencia"       on public.marca_asistencia;
drop policy if exists "insercion_marca_asistencia"     on public.marca_asistencia;
drop policy if exists "lectura_periodo_cerrado"        on public.periodo_cerrado;
drop policy if exists "insercion_periodo_cerrado"      on public.periodo_cerrado;
drop policy if exists "borrado_periodo_cerrado"        on public.periodo_cerrado;
drop policy if exists "lectura_auditoria"              on public.auditoria;

create policy "lectura_correccion" on public.correccion
  for select to authenticated using (true);

-- Solo el dueño anula/corrige. El motivo es obligatorio por CHECK.
create policy "insercion_correccion_duenio" on public.correccion
  for insert to authenticated
  with check (public.es_duenio());

create policy "lectura_evidencia" on public.evidencia
  for select to authenticated
  using (
    public.es_duenio()
    or exists (
      select 1 from public.turno t
      where t.id = evidencia.turno_id
        and t.chofer_id = public.mi_chofer_id()
    )
    or exists (
      select 1
      from public.gasto g
      join public.turno t on t.id = g.turno_id
      where g.id = evidencia.gasto_id
        and t.chofer_id = public.mi_chofer_id()
    )
  );

create policy "insercion_evidencia" on public.evidencia
  for insert to authenticated
  with check (
    public.es_duenio()
    or exists (
      select 1 from public.turno t
      where t.id = evidencia.turno_id
        and t.chofer_id = public.mi_chofer_id()
    )
    or exists (
      select 1
      from public.gasto g
      join public.turno t on t.id = g.turno_id
      where g.id = evidencia.gasto_id
        and t.chofer_id = public.mi_chofer_id()
    )
  );

create policy "lectura_marca_asistencia" on public.marca_asistencia
  for select to authenticated using (true);

-- El chofer solo puede marcar su propia asistencia; el dueño, cualquiera.
create policy "insercion_marca_asistencia" on public.marca_asistencia
  for insert to authenticated
  with check (
    public.es_duenio() or chofer_id = public.mi_chofer_id()
  );

create policy "lectura_periodo_cerrado" on public.periodo_cerrado
  for select to authenticated using (true);

create policy "insercion_periodo_cerrado" on public.periodo_cerrado
  for insert to authenticated
  with check (public.es_duenio());

-- Reabrir un período es un acto explícito del dueño (y queda auditado fuera
-- de la app por el log de Supabase). Los registros del período no se tocan.
create policy "borrado_periodo_cerrado" on public.periodo_cerrado
  for delete to authenticated
  using (public.es_duenio());

create policy "lectura_auditoria" on public.auditoria
  for select to authenticated
  using (public.es_duenio());

-- ---------------------------------------------------------------------------
-- 9) Keep-alive: evita que Supabase pause el proyecto por inactividad.
--    Un cron externo (GitHub Actions) llama a esta RPC una vez por día.
-- ---------------------------------------------------------------------------

create table if not exists public.keepalive (
  id         smallint primary key default 1 check (id = 1),
  pinged_at  timestamptz not null default now()
);

alter table public.keepalive enable row level security;

create or replace function public.keepalive()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  insert into public.keepalive (id, pinged_at)
  values (1, v_now)
  on conflict (id) do update set pinged_at = excluded.pinged_at;

  return v_now;
end;
$$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;

-- ===========================================================================
-- FIN DE LA MIGRACI�"N
-- ===========================================================================
