-- =========================================================================
-- MIGRACIÓN v3: registro del consentimiento del aviso de privacidad
-- Ejecutar en Supabase > SQL Editor (una sola vez)
-- =========================================================================
alter table evaluaciones
  add column if not exists acepto_aviso boolean not null default false;
