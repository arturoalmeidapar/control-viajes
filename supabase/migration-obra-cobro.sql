-- ============================================================
-- MIGRACIÓN: obra_cobro_id + flujo pipa/desmonte/basura
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Permitir obra_destino_id nulo (desmonte → Trinchera, basura → Basurero)
ALTER TABLE viajes ALTER COLUMN obra_destino_id DROP NOT NULL;

-- 2. Agregar columna obra_cobro_id
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS obra_cobro_id uuid REFERENCES obras(id);

-- 3. Índice para rendimiento
CREATE INDEX IF NOT EXISTS idx_viajes_obra_cobro ON viajes(obra_cobro_id);

-- 4. Rellenar registros existentes
UPDATE viajes SET obra_cobro_id = CASE
  WHEN tipo_material IN ('desmonte', 'basura') THEN obra_origen_id
  ELSE obra_destino_id
END
WHERE obra_cobro_id IS NULL;

-- 5. Actualizar política RLS de lectura para residentes
--    (incluir desmonte/basura visibles por obra_origen)
DROP POLICY IF EXISTS "read_viajes" ON viajes;
CREATE POLICY "read_viajes" ON viajes FOR SELECT TO authenticated USING (
  get_rol_usuario() = 'admin'
  OR checador_id = auth.uid()
  OR obra_destino_id IN (
    SELECT obra_id FROM residentes_obras WHERE usuario_id = auth.uid()
  )
  OR (
    tipo_material IN ('desmonte', 'basura')
    AND obra_origen_id IN (
      SELECT obra_id FROM residentes_obras WHERE usuario_id = auth.uid()
    )
  )
);

-- 6. Actualizar política RLS de actualización para residentes
DROP POLICY IF EXISTS "residente_update_estado" ON viajes;
CREATE POLICY "residente_update_estado" ON viajes FOR UPDATE TO authenticated
  USING (
    get_rol_usuario() = 'admin'
    OR (
      get_rol_usuario() = 'residente'
      AND (
        obra_destino_id IN (SELECT obra_id FROM residentes_obras WHERE usuario_id = auth.uid())
        OR (
          tipo_material IN ('desmonte', 'basura')
          AND obra_origen_id IN (SELECT obra_id FROM residentes_obras WHERE usuario_id = auth.uid())
        )
      )
    )
  )
  WITH CHECK (true);
