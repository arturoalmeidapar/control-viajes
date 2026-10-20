-- ============================================================
-- MIGRACIÓN: tabla de log para la limpieza automática de fotos
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================
-- Usada por app/api/cron/limpiar-fotos/route.ts (cron mensual de Vercel).
-- Cada corrida inserta una fila con el resultado; nunca se actualiza ni
-- se borra una fila existente desde la app. Es segura de ejecutar varias veces.
-- ============================================================

CREATE TABLE IF NOT EXISTS limpieza_fotos_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ejecutado_at        timestamptz NOT NULL DEFAULT now(),
  corte               timestamptz NOT NULL,       -- fecha límite: se borró todo lo anterior a este instante
  viajes_encontrados  integer NOT NULL,
  archivos_borrados   integer NOT NULL,
  archivos_fallidos   integer NOT NULL,
  foto_url_limpiados  integer NOT NULL,
  error               text
);

ALTER TABLE limpieza_fotos_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_lee_limpieza_fotos_log" ON limpieza_fotos_log;
CREATE POLICY "admin_lee_limpieza_fotos_log" ON limpieza_fotos_log
  FOR SELECT TO authenticated
  USING (get_rol_usuario() = 'admin');

-- Sin políticas de INSERT/UPDATE/DELETE para "authenticated": solo el cron
-- (que usa la service role key y por lo tanto evade RLS) puede escribir aquí.
