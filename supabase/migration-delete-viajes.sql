-- ============================================================
-- MIGRACIÓN: permitir DELETE en viajes solo a administradores
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE POLICY "admin_delete_viaje" ON viajes
  FOR DELETE TO authenticated
  USING (get_rol_usuario() = 'admin');
