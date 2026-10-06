-- Datos de la web pública: centros, tarifas y horario de clases.
-- La IA reescribe este archivo con los datos del comprador durante la instalación.
-- Solo hay que editar los bloques marcados "-- PERSONALIZAR". Es re-ejecutable: centros y
-- tarifas se actualizan por slug y el horario plantilla se vacía y se vuelve a cargar.

-- ═══════════ PERSONALIZAR: centros (el slug identifica cada centro) ═══════════
insert into public.centros (nombre, slug, ciudad, direccion, telefono, aforo, horario) values
('Ice Gym Chamberí', 'chamberi', 'Madrid',    'Calle Bravo Murillo 112, 28020 Madrid',  '+34 910 55 12 01', 320, 'L-V 6:30-23:30 · S-D 8:00-22:00'),
('Ice Gym Poblenou', 'poblenou', 'Barcelona', 'Carrer de Pujades 189, 08005 Barcelona', '+34 930 22 48 60', 260, 'L-V 7:00-23:00 · S-D 9:00-21:00'),
('Ice Gym Ruzafa',   'ruzafa',   'Valencia',  'Carrer de Sueca 41, 46006 València',     '+34 960 71 30 44', 195, 'L-V 7:00-22:30 · S-D 9:00-20:00')
on conflict (slug) do update set
  nombre = excluded.nombre, ciudad = excluded.ciudad, direccion = excluded.direccion,
  telefono = excluded.telefono, aforo = excluded.aforo, horario = excluded.horario;
-- ═══════════ FIN PERSONALIZAR: centros ═══════════

-- ═══════════ PERSONALIZAR: tarifas (el slug identifica cada tarifa) ═══════════
insert into public.tarifas (nombre, slug, cuota_mensual, matricula, descripcion, incluye, destacada, orden) values
('Basic', 'basic', 19.99, 29.99,
 'Entrena a tu aire en tu centro, con sala de musculación y cardio sin límite de horario.',
 array['Acceso a tu centro','Sala de musculación y cardio','Vestuarios y taquillas','App de seguimiento'], false, 1),
('Comfort', 'comfort', 29.99, 19.99,
 'Todos los centros de la cadena, clases colectivas incluidas y un invitado al mes.',
 array['Acceso a los 3 centros','Clases colectivas ilimitadas','Reserva de clase con 7 días','1 invitado al mes','Zona de recuperación'], true, 2),
('Premium', 'premium', 44.99, 0,
 'Todo lo anterior más entrenador personal, plan nutricional y acceso prioritario en hora punta.',
 array['Todo lo de Comfort','2 sesiones con entrenador al mes','Plan de nutrición','Acceso prioritario en hora punta','Invitados ilimitados','Toalla incluida'], false, 3)
on conflict (slug) do update set
  nombre = excluded.nombre, cuota_mensual = excluded.cuota_mensual, matricula = excluded.matricula,
  descripcion = excluded.descripcion, incluye = excluded.incluye, destacada = excluded.destacada,
  orden = excluded.orden;
-- ═══════════ FIN PERSONALIZAR: tarifas ═══════════

-- Horario semanal "plantilla". La landing solo enseña clases FUTURAS, así que
-- programar_clases() genera las próximas N semanas a partir de esta plantilla.
create table if not exists public.horario_clases (
  id uuid primary key default gen_random_uuid(),
  centro_slug text not null,
  dia_semana int not null check (dia_semana between 1 and 7), -- 1 = lunes
  hora time not null,
  nombre text not null, disciplina text not null, monitor text not null,
  sala text, duracion_min int not null default 45, plazas int not null default 20,
  nivel text not null default 'todos'
);
alter table public.horario_clases enable row level security;
drop policy if exists "Equipo gestiona horario" on public.horario_clases;
create policy "Equipo gestiona horario" on public.horario_clases for all to authenticated using (true) with check (true);

-- ═══════════ PERSONALIZAR: horario semanal (centro_slug = slug de centros) ═══════════
-- Se vacía y se recarga en cada ejecución. Las clases ya generadas no se duplican.
delete from public.horario_clases;
insert into public.horario_clases (centro_slug, dia_semana, hora, nombre, disciplina, monitor, sala, duracion_min, plazas, nivel)
select c.slug, d, h.hora, h.nombre, h.disciplina, h.monitor, h.sala, h.dur, h.plazas, h.nivel
from (values ('chamberi'),('poblenou'),('ruzafa')) c(slug)
cross join generate_series(1,5) d
cross join (values
  ('07:30'::time, 'Ice Cycle',   'Ciclo',        'Nerea Gil',    'Sala Ciclo',     45, 24, 'todos'),
  ('09:30'::time, 'Yoga Flow',   'Mente-cuerpo', 'Kevin Ruano',  'Sala Zen',       60, 18, 'todos'),
  ('13:30'::time, 'Core 30',     'Funcional',    'Iván Soto',    'Sala Funcional', 30, 16, 'iniciacion'),
  ('18:30'::time, 'Hyrox Prep',  'Funcional',    'Laura Peña',   'Sala Funcional', 60, 14, 'avanzado'),
  ('20:00'::time, 'Ice Cycle',   'Ciclo',        'Nerea Gil',    'Sala Ciclo',     45, 24, 'todos')
) h(hora, nombre, disciplina, monitor, sala, dur, plazas, nivel)
union all
select c.slug, d, h.hora, h.nombre, h.disciplina, h.monitor, h.sala, h.dur, h.plazas, h.nivel
from (values ('chamberi'),('poblenou'),('ruzafa')) c(slug)
cross join generate_series(6,7) d
cross join (values
  ('10:00'::time, 'Yoga Flow',   'Mente-cuerpo', 'Kevin Ruano',  'Sala Zen',   60, 18, 'todos'),
  ('11:30'::time, 'Ice Cycle',   'Ciclo',        'Nerea Gil',    'Sala Ciclo', 45, 24, 'todos')
) h(hora, nombre, disciplina, monitor, sala, dur, plazas, nivel);
-- ═══════════ FIN PERSONALIZAR: horario ═══════════

create or replace function public.programar_clases(semanas int default 2)
returns int language plpgsql security definer set search_path to '' as $$
declare n int;
begin
  insert into public.clases (centro_id, nombre, disciplina, monitor, sala, inicio, duracion_min, plazas, nivel)
  select c.id, h.nombre, h.disciplina, h.monitor, h.sala,
         ((dia::date + h.hora) at time zone 'Europe/Madrid'), h.duracion_min, h.plazas, h.nivel
  from generate_series(current_date, current_date + semanas * 7 - 1, interval '1 day') dia
  join public.horario_clases h on h.dia_semana = extract(isodow from dia)
  join public.centros c on c.slug = h.centro_slug and c.activo
  where not exists (
    select 1 from public.clases x
    where x.centro_id = c.id and x.nombre = h.nombre
      and x.inicio = ((dia::date + h.hora) at time zone 'Europe/Madrid')
  );
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.programar_clases(int) from public, anon, authenticated;

select public.programar_clases(2);

-- Para que el horario no se quede vacío: Database → Extensions → activar pg_cron y ejecutar
--   select cron.schedule('programar-clases', '0 3 * * *', $$select public.programar_clases(2)$$);
