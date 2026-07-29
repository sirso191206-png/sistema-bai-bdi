-- =========================================================================
-- MIGRACIÓN v4: vista de listado de pacientes (un renglón por paciente,
-- con su última aplicación) — para la nueva sección "Pacientes"
-- Ejecutar en Supabase > SQL Editor (una sola vez)
-- =========================================================================
create or replace view vista_pacientes_listado as
select
    p.id as paciente_id,
    p.nombre_completo,
    p.curp,
    p.fecha_nacimiento,
    p.fecha_registro,
    (select count(*) from evaluaciones e where e.paciente_id = p.id) as total_aplicaciones,
    ult.fecha as ultima_fecha,
    ult.puntaje_bai,
    ult.nivel_ansiedad,
    ult.puntaje_bdi,
    ult.nivel_depresion,
    exists(
      select 1 from evaluaciones e2
      where e2.paciente_id = p.id and e2.acepto_aviso = true
    ) as aviso_aceptado
from pacientes p
left join lateral (
    select v.fecha, v.puntaje_bai, v.nivel_ansiedad, v.puntaje_bdi, v.nivel_depresion
    from vista_evaluaciones_completas v
    where v.paciente_id = p.id
    order by v.fecha desc
    limit 1
) ult on true
where p.activo = true;
