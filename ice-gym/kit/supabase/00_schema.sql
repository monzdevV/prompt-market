-- Esquema completo de la plantilla (web pública + CRM B2B).
-- Ejecutar en Supabase: SQL Editor → pegar → Run. Es re-ejecutable: tablas e índices usan
-- "if not exists" y políticas/trigger se borran y recrean. Ojo: "create table if not exists" NO
-- modifica una tabla que ya exista; para cambiar columnas usa "alter table".
-- Seguridad: RLS en todas las tablas. El público (anon) solo lee centros, tarifas y clases
-- y solo puede CREAR leads (no leerlos). El equipo (authenticated) puede todo.

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path to '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────── Web pública ─────────────────────────

create table if not exists public.centros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null check (char_length(nombre) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  ciudad text not null check (char_length(ciudad) <= 80),
  direccion text not null check (char_length(direccion) <= 200),
  telefono text check (char_length(telefono) <= 30),
  aforo integer not null default 0 check (aforo >= 0),
  horario text check (char_length(horario) <= 200),
  activo boolean not null default true
);

create table if not exists public.tarifas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null unique check (char_length(nombre) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  cuota_mensual numeric(10,2) not null check (cuota_mensual >= 0),
  matricula numeric(10,2) not null default 0 check (matricula >= 0),
  descripcion text check (char_length(descripcion) <= 300),
  incluye text[] not null default '{}',
  destacada boolean not null default false,
  orden integer not null default 0,
  activa boolean not null default true
);

create table if not exists public.clases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  centro_id uuid not null references public.centros(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 80),
  disciplina text not null check (char_length(disciplina) <= 60),
  monitor text not null check (char_length(monitor) <= 80),
  sala text check (char_length(sala) <= 60),
  inicio timestamptz not null,
  duracion_min integer not null default 45 check (duracion_min between 10 and 240),
  plazas integer not null default 20 check (plazas > 0),
  nivel text not null default 'todos' check (nivel in ('todos','iniciacion','avanzado'))
);
create index if not exists clases_centro_inicio_idx on public.clases (centro_id, inicio);
create index if not exists clases_inicio_idx on public.clases (inicio);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nombre text not null check (char_length(nombre) between 2 and 120),
  email text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefono text check (char_length(telefono) <= 30),
  mensaje text check (char_length(mensaje) <= 2000),
  origen text not null default 'web' check (origen in ('web','visita','telefono','recomendacion','campana')),
  estado text not null default 'nuevo' check (estado in ('nuevo','contactado','visita_agendada','en_prueba','convertido','perdido')),
  notas text,
  centro_id uuid references public.centros(id) on delete set null,
  tarifa_interes_id uuid references public.tarifas(id) on delete set null,
  fecha_visita timestamptz,
  motivo_perdida text check (char_length(motivo_perdida) <= 300),
  valor_estimado numeric(10,2) check (valor_estimado is null or valor_estimado >= 0),
  probabilidad smallint check (probabilidad is null or probabilidad between 0 and 100),
  proxima_accion text,
  proxima_accion_fecha timestamptz,
  etiquetas text[] not null default '{}'
);
create index if not exists leads_estado_idx on public.leads (estado);
create index if not exists leads_centro_idx on public.leads (centro_id);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_tarifa_interes_idx on public.leads (tarifa_interes_id);
drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- ───────────────────────── CRM B2B ─────────────────────────

create table if not exists public.equipo (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  apellidos text not null default '',
  email text not null unique,
  puesto text,
  color text not null default 'azul' check (color in ('azul','violeta','ambar','rosa','verde','gris')),
  activo boolean not null default true
);

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nombre text not null check (char_length(nombre) between 1 and 200),
  tipo text not null default 'prospecto' check (tipo in ('cliente','proveedor','partner','prospecto','distribuidor','fabricante','colaborador')),
  sector text not null default 'otros',
  web text, email text, telefono text, direccion text, ciudad text,
  pais text not null default 'España',
  cif text, descripcion text, notas text, logo_url text,
  estado text not null default 'activa' check (estado in ('activa','inactiva','en_evaluacion','bloqueada')),
  responsable_id uuid references public.equipo(id) on delete set null
);

create table if not exists public.contactos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  empresa_id uuid references public.empresas(id) on delete set null,
  nombre text not null check (char_length(nombre) between 1 and 120),
  apellidos text not null default '',
  cargo text, email text, telefono text, linkedin text, ciudad text,
  pais text not null default 'España',
  avatar_url text,
  tipo text not null default 'comercial' check (tipo in ('decisor','comercial','compras','tecnico','financiero','direccion','operaciones','otro')),
  rol text,
  principal boolean not null default false,
  estado text not null default 'activo' check (estado in ('activo','inactivo')),
  responsable_id uuid references public.equipo(id) on delete set null,
  notas text
);
create index if not exists contactos_empresa_id_idx on public.contactos (empresa_id);

create table if not exists public.oportunidades (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nombre text not null check (char_length(nombre) between 1 and 200),
  tipo text not null default 'venta_cliente' check (tipo in ('venta_cliente','compra_proveedor','proveedor_maquinaria','proveedor_agua','proveedor_bebidas','proveedor_productos','proveedor_tecnologia','servicios_profesionales','colaboracion','distribucion','partnership','otros')),
  etapa text not null default 'prospeccion' check (etapa in ('prospeccion','cualificacion','propuesta','negociacion','ganada','perdida')),
  posicion double precision not null default 0,
  valor numeric(12,2) not null default 0 check (valor >= 0),
  probabilidad integer check (probabilidad between 0 and 100),
  fecha_cierre date,
  prioridad text not null default 'media' check (prioridad in ('baja','media','alta','urgente')),
  estado text not null default 'abierta' check (estado in ('abierta','en_pausa','ganada','perdida')),
  origen text not null default 'otro' check (origen in ('web','referido','evento','llamada_fria','email','linkedin','feria','partner','inbound','otro')),
  empresa_id uuid references public.empresas(id) on delete set null,
  contacto_id uuid references public.contactos(id) on delete set null,
  responsable_id uuid references public.equipo(id) on delete set null,
  descripcion text, necesidad text, notas text,
  proxima_accion text,
  proxima_accion_fecha timestamptz,
  motivo_perdida text
);
create index if not exists oportunidades_empresa_id_idx on public.oportunidades (empresa_id);
create index if not exists oportunidades_contacto_id_idx on public.oportunidades (contacto_id);
create index if not exists oportunidades_etapa_posicion_idx on public.oportunidades (etapa, posicion);

create table if not exists public.interacciones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tipo text not null check (tipo in ('llamada','email','reunion','nota','tarea','seguimiento','cambio_etapa')),
  titulo text not null check (char_length(titulo) between 1 and 200),
  descripcion text,
  fecha timestamptz not null default now(),
  estado text not null default 'completada' check (estado in ('pendiente','completada','cancelada')),
  prioridad text not null default 'media' check (prioridad in ('baja','media','alta','urgente')),
  completada_at timestamptz,
  responsable_id uuid references public.equipo(id) on delete set null,
  empresa_id uuid references public.empresas(id) on delete cascade,
  contacto_id uuid references public.contactos(id) on delete cascade,
  oportunidad_id uuid references public.oportunidades(id) on delete cascade,
  creado_por uuid default auth.uid() references auth.users(id) on delete set null
);
create index if not exists interacciones_empresa_id_fecha_idx on public.interacciones (empresa_id, fecha desc);
create index if not exists interacciones_contacto_id_fecha_idx on public.interacciones (contacto_id, fecha desc);
create index if not exists interacciones_oportunidad_id_fecha_idx on public.interacciones (oportunidad_id, fecha desc);
create index if not exists interacciones_tipo_estado_fecha_idx on public.interacciones (tipo, estado, fecha);

-- ───────────────────────── RLS ─────────────────────────

do $$
declare t text;
begin
  foreach t in array array['centros','tarifas','clases','leads','equipo','empresas','contactos','oportunidades','interacciones'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Equipo ve %1$s" on public.%1$I', t);
    execute format('create policy "Equipo ve %1$s" on public.%1$I for select to authenticated using (true)', t);
    execute format('drop policy if exists "Equipo crea %1$s" on public.%1$I', t);
    execute format('create policy "Equipo crea %1$s" on public.%1$I for insert to authenticated with check (true)', t);
    execute format('drop policy if exists "Equipo edita %1$s" on public.%1$I', t);
    execute format('create policy "Equipo edita %1$s" on public.%1$I for update to authenticated using (true) with check (true)', t);
    execute format('drop policy if exists "Equipo borra %1$s" on public.%1$I', t);
    execute format('create policy "Equipo borra %1$s" on public.%1$I for delete to authenticated using (true)', t);
  end loop;
end $$;

drop policy if exists "Publico ve centros activos" on public.centros;
create policy "Publico ve centros activos" on public.centros for select to anon using (activo);
drop policy if exists "Publico ve tarifas activas" on public.tarifas;
create policy "Publico ve tarifas activas" on public.tarifas for select to anon using (activa);
drop policy if exists "Publico ve clases" on public.clases;
create policy "Publico ve clases" on public.clases for select to anon using (true);
drop policy if exists "Web publica crea leads" on public.leads;
create policy "Web publica crea leads" on public.leads for insert to anon
  with check (estado = 'nuevo' and origen = 'web');
