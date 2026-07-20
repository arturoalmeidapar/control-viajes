-- ============================================================
-- MIGRACIÓN: permitir UPDATE completo en viajes solo a admin
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Separar la política combinada en dos más claras:
-- la anterior "residente_update_estado" también cubría a admins,
-- pero es confuso. Ahora hay una política explícita por rol.

DROP POLICY IF EXISTS "residente_update_estado" ON viajes;

-- Admins pueden actualizar cualquier campo de cualquier viaje
CREATE POLICY "admin_update_viaje" ON viajes
  FOR UPDATE TO authenticated
  USING (get_rol_usuario() = 'admin')
  WITH CHECK (get_rol_usuario() = 'admin');

-- Residentes pueden cambiar estado/motivo_rechazo en viajes de sus obras
CREATE POLICY "residente_update_estado" ON viajes
  FOR UPDATE TO authenticated
  USING (
    get_rol_usuario() = 'residente'
    AND (
      obra_destino_id IN (
        SELECT obra_id FROM residentes_obras WHERE usuario_id = auth.uid()
      )
      OR (
        tipo_material IN ('desmonte', 'basura')
        AND obra_origen_id IN (
          SELECT obra_id FROM residentes_obras WHERE usuario_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (true);
