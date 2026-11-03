-- =====================================================================
-- CMMS Bellota · Línea de cuchillas
-- Esquema de base de datos para Supabase (PostgreSQL)
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- =====================================================================

-- ---------- Tablas -----------------------------------------------------

create table if not exists public.equipos (
  id                     text primary key,            -- código del equipo (HC-T3, BS-01…)
  nombre                 text not null,
  nombre_planta          text,
  linea                  text,
  seccion                text,
  tipo                   text,
  fabricante             text,
  modelo                 text,
  activo_fijo            text,
  fecha_creacion         date,
  capacidad              text,
  fuente_trabajo         text,
  probabilidad           int check (probabilidad between 1 and 5),
  consecuencia           int check (consecuencia between 1 and 5),
  repuestos_promedio     numeric default 0,           -- COP por correctivo (Anexo 4)
  presupuesto_preventivo numeric default 0,           -- COP por año (Anexo 4)
  created_at             timestamptz default now()
);

create table if not exists public.tecnicos (
  id            text primary key,                      -- MEC-01…
  nombre        text not null,
  especialidad  text,
  turno         text,
  tarifa_hora   numeric,                               -- vacío = tarifa general de parámetros
  created_at    timestamptz default now()
);

create table if not exists public.fallas (
  id             text primary key,
  codigo_equipo  text not null references public.equipos(id) on update cascade on delete cascade,
  motivo         text not null,
  criticidad     int check (criticidad between 1 and 10),
  created_at     timestamptz default now(),
  unique (codigo_equipo, motivo)
);

create table if not exists public.plan (
  id             text primary key,                     -- PM-HC-01…
  codigo_equipo  text not null references public.equipos(id) on update cascade on delete cascade,
  actividad      text not null,
  descripcion    text,
  frecuencia     text not null,                        -- Diaria, Semanal, Bisemanal, Mensual, Bimestral, Trimestral, Semestral, Anual, Por intervención
  responsable    text,
  duracion_h     numeric default 0,
  costo_insumos  numeric default 0,
  fecha_inicio   date,
  observaciones  text,
  created_at     timestamptz default now()
);

create table if not exists public.ordenes (
  id                  text primary key,                -- N° OT
  origen              text,
  fecha_solicitud     date not null,
  codigo_equipo       text not null references public.equipos(id) on update cascade on delete restrict,
  tipo                text not null,                   -- Correctivo, Preventivo, Predictivo, Mejora
  id_plan             text references public.plan(id) on update cascade on delete set null,
  motivo              text,
  causa               text,
  subsistema          text,
  prioridad           text,
  tecnico             text references public.tecnicos(id) on update cascade on delete set null,
  detiene_produccion  boolean default true,
  fecha_inicio        date,
  hora_inicio         text,
  fecha_fin           date,
  hora_fin            text,
  horas_hombre        numeric,
  costo_repuestos     numeric,
  accion              text,
  observaciones       text,
  created_at          timestamptz default now(),
  check (fecha_fin is null or fecha_inicio is not null),
  check (fecha_fin is null or fecha_fin >= fecha_inicio)
);
create index if not exists ordenes_equipo_idx on public.ordenes (codigo_equipo);
create index if not exists ordenes_fecha_idx  on public.ordenes (fecha_solicitud);
create index if not exists ordenes_plan_idx   on public.ordenes (id_plan);

create table if not exists public.repuestos (
  id              text primary key,                    -- REP-001…
  descripcion     text not null,
  codigo_equipo   text references public.equipos(id) on update cascade on delete set null,
  subsistema      text,
  unidad          text,
  stock_actual    numeric default 0,
  stock_minimo    numeric default 0,
  costo_unitario  numeric default 0,
  created_at      timestamptz default now()
);

create table if not exists public.parametros (
  id     text primary key,                             -- 'general'
  valor  jsonb not null
);

-- ---------- Seguridad --------------------------------------------------
-- 1) Permisos explícitos: solo el rol "authenticated" (usuarios con sesión)
--    puede usar las tablas; el rol "anon" (visitantes sin sesión) no tiene acceso.
--    Funciona aunque "Automatically expose new tables" esté desactivado.
-- 2) Row Level Security: además, cada fila exige haber iniciado sesión.

grant usage on schema public to authenticated;

do $$
declare t text;
begin
  foreach t in array array['equipos','tecnicos','fallas','plan','ordenes','repuestos','parametros'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "lectura_autenticados" on public.%I', t);
    execute format('drop policy if exists "escritura_autenticados" on public.%I', t);
    execute format('create policy "lectura_autenticados" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "escritura_autenticados" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
