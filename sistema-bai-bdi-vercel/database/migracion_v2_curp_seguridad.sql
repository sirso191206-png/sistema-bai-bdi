-- =========================================================================
-- MIGRACIÓN v2: CURP + cierre de seguridad para arquitectura con backend
-- Ejecutar en Supabase > SQL Editor (una sola vez)
-- =========================================================================

-- 1) Columna CURP en pacientes (única cuando exista)
alter table pacientes add column if not exists curp varchar(18);
create unique index if not exists pacientes_curp_unico
  on pacientes (curp) where curp is not null;

-- 2) CERRAR el acceso directo desde el navegador.
--    Con el backend en Vercel usando la service_role key (que ignora RLS),
--    ya nadie necesita leer las tablas con la publishable/anon key.
--    Al eliminar las policies, RLS niega todo por defecto para anon y
--    authenticated. Los Apps Script NO se afectan (usan service_role).
drop policy if exists "acceso_total_pacientes"    on pacientes;
drop policy if exists "acceso_total_evaluaciones" on evaluaciones;
drop policy if exists "acceso_total_bai"          on bai;
drop policy if exists "acceso_total_bdi"          on bdi;
drop policy if exists "acceso_total_sync_log"     on sync_log;

-- 3) Vista de estadísticas con fecha de México (corrige "Evaluados hoy"
--    que se ponía en cero después de las 6 pm por el desfase UTC)
create or replace view vista_estadisticas_globales as
select
    (select count(*) from pacientes where activo = true) as total_pacientes,
    (select count(*) from evaluaciones
       where fecha = (now() at time zone 'America/Mexico_City')::date) as evaluados_hoy,
    (select count(*) from pacientes where activo = true) -
        (select count(*) from evaluaciones
           where fecha = (now() at time zone 'America/Mexico_City')::date) as pendientes_hoy,
    (select count(*) from bai where nivel_ansiedad = 'Mínima')   as ansiedad_minima,
    (select count(*) from bai where nivel_ansiedad = 'Leve')     as ansiedad_leve,
    (select count(*) from bai where nivel_ansiedad = 'Moderada') as ansiedad_moderada,
    (select count(*) from bai where nivel_ansiedad = 'Severa')   as ansiedad_severa,
    (select count(*) from bdi where nivel_depresion = 'Mínima')   as depresion_minima,
    (select count(*) from bdi where nivel_depresion = 'Leve')     as depresion_leve,
    (select count(*) from bdi where nivel_depresion = 'Moderada') as depresion_moderada,
    (select count(*) from bdi where nivel_depresion = 'Severa')   as depresion_severa;
