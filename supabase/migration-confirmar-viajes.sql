-- ============================================================
-- MIGRACIÓN: confirmar/rechazar viajes desde panel admin
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================
-- Esta migración garantiza que exista una política explícita
-- que permita a admin hacer UPDATE en cualquier viaje.
-- Es segura de ejecutar aunque ya hayas aplicado migration-edit-viajes.sql.
-- ============================================================

DROP POLICY IF EXISTS "admin_update_viaje" ON viajes;

CREATE POLICY "admin_update_viaje" ON viajes
  FOR UPDATE TO authenticated
  USING (get_rol_usuario() = 'admin')
  WITH CHECK (get_rol_usuario() = 'admin');
