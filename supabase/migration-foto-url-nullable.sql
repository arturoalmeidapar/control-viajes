-- ============================================================
-- MIGRACIÓN: permitir foto_url nulo en viajes
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================
-- Necesaria para la limpieza de fotos antiguas del storage
-- (scripts/limpiar-fotos-antiguas.mjs): el registro del viaje se
-- conserva intacto y solo se borra el archivo, dejando foto_url en NULL.
-- Es segura de ejecutar varias veces.
-- ============================================================

ALTER TABLE viajes ALTER COLUMN foto_url DROP NOT NULL;
