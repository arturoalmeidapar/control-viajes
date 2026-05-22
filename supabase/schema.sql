-- ============================================================
-- SCHEMA — Control Viajes URB Los Cabos
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Tipos enumerados
CREATE TYPE tipo_unidad   AS ENUM ('camion', 'pipa');
CREATE TYPE tipo_material AS ENUM ('desmonte', 'material', 'agua', 'basura');
CREATE TYPE estado_viaje  AS ENUM ('pendiente', 'confirmado', 'rechazado');
CREATE TYPE rol_usuario   AS ENUM ('admin', 'checador', 'residente');

-- ─────────────────────────────────────────────────
-- Tablas
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contratistas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         text NOT NULL,
  codigo         text NOT NULL UNIQUE,
  tarifa_especial boolean NOT NULL DEFAULT false,
  activo         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS unidades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contratista_id  uuid NOT NULL REFERENCES contratistas(id) ON DELETE CASCADE,
  identificador   text NOT NULL,
  tipo            tipo_unidad NOT NULL,
  capacidad_m3    numeric,
  activo          boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS obras (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text NOT NULL,
  activo       boolean NOT NULL DEFAULT true,
  es_campo_golf boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS usuarios (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre            text NOT NULL,
  email             text NOT NULL UNIQUE,
  rol               rol_usuario NOT NULL,
  activo            boolean NOT NULL DEFAULT true,
  push_subscription jsonb
);

CREATE TABLE IF NOT EXISTS residentes_obras (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  obra_id    uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  UNIQUE(usuario_id, obra_id)
);

CREATE TABLE IF NOT EXISTS distancias (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_origen_id    uuid NOT NULL REFERENCES obras(id),
  obra_destino_id   uuid NOT NULL REFERENCES obras(id),
  distancia_km      numeric NOT NULL,
  nota              text
);

CREATE TABLE IF NOT EXISTS tarifas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_material        tipo_material NOT NULL,
  precio_m3            numeric NOT NULL,
  precio_km_adicional  numeric NOT NULL DEFAULT 0,
  km_base              integer NOT NULL DEFAULT 3,
  solo_contratista_id  uuid REFERENCES contratistas(id)
);

CREATE TABLE IF NOT EXISTS viajes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  checador_id         uuid NOT NULL REFERENCES usuarios(id),
  contratista_id      uuid NOT NULL REFERENCES contratistas(id),
  unidad_id           uuid NOT NULL REFERENCES unidades(id),
  obra_origen_id      uuid NOT NULL REFERENCES obras(id),
  obra_destino_id     uuid NOT NULL REFERENCES obras(id),
  zona_destino        text,
  m3                  numeric NOT NULL,
  tipo_material       tipo_material NOT NULL,
  distancia_km        numeric NOT NULL,
  importe_calculado   numeric NOT NULL,
  foto_url            text NOT NULL,
  gps_lat             numeric,
  gps_lng             numeric,
  foto_timestamp      timestamptz NOT NULL,
  estado              estado_viaje NOT NULL DEFAULT 'pendiente',
  residente_id        uuid REFERENCES usuarios(id),
  residente_timestamp timestamptz,
  motivo_rechazo      text,
  notas               text
);

-- Índice para consultas por fecha (muy frecuentes)
CREATE INDEX IF NOT EXISTS idx_viajes_created_at ON viajes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_viajes_estado ON viajes(estado);
CREATE INDEX IF NOT EXISTS idx_viajes_obra_destino ON viajes(obra_destino_id);
CREATE INDEX IF NOT EXISTS idx_viajes_checador ON viajes(checador_id);

-- ─────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────

ALTER TABLE contratistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE residentes_obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE distancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifas ENABLE ROW LEVEL SECURITY;
ALTER TABLE viajes ENABLE ROW LEVEL SECURITY;

-- Función helper para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_rol_usuario()
RETURNS rol_usuario LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid()
$$;

-- Datos de referencia: lectura para todos los autenticados
CREATE POLICY "auth_read_contratistas" ON contratistas FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_contratistas" ON contratistas FOR ALL TO authenticated USING (get_rol_usuario() = 'admin');

CREATE POLICY "auth_read_unidades" ON unidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_unidades" ON unidades FOR ALL TO authenticated USING (get_rol_usuario() = 'admin');

CREATE POLICY "auth_read_obras" ON obras FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_obras" ON obras FOR ALL TO authenticated USING (get_rol_usuario() = 'admin');

CREATE POLICY "auth_read_distancias" ON distancias FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_distancias" ON distancias FOR ALL TO authenticated USING (get_rol_usuario() = 'admin');

CREATE POLICY "auth_read_tarifas" ON tarifas FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_tarifas" ON tarifas FOR ALL TO authenticated USING (get_rol_usuario() = 'admin');

-- Usuarios: leer propio perfil + admin lee todos
CREATE POLICY "read_own_or_admin" ON usuarios FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_rol_usuario() = 'admin');
CREATE POLICY "update_own" ON usuarios FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin_insert_usuario" ON usuarios FOR INSERT TO authenticated
  WITH CHECK (get_rol_usuario() = 'admin');

-- Residentes_obras: ver propios + admin/checador ven todos
CREATE POLICY "read_residentes_obras" ON residentes_obras FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR get_rol_usuario() IN ('admin', 'checador'));
CREATE POLICY "admin_write_residentes_obras" ON residentes_obras FOR ALL TO authenticated
  USING (get_rol_usuario() = 'admin');

-- Viajes: lectura filtrada por rol
CREATE POLICY "read_viajes" ON viajes FOR SELECT TO authenticated USING (
  get_rol_usuario() = 'admin'
  OR checador_id = auth.uid()
  OR obra_destino_id IN (
    SELECT obra_id FROM residentes_obras WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "checador_insert_viaje" ON viajes FOR INSERT TO authenticated
  WITH CHECK (
    checador_id = auth.uid()
    AND get_rol_usuario() IN ('admin', 'checador')
  );

CREATE POLICY "residente_update_estado" ON viajes FOR UPDATE TO authenticated
  USING (
    get_rol_usuario() = 'admin'
    OR (
      get_rol_usuario() = 'residente'
      AND obra_destino_id IN (SELECT obra_id FROM residentes_obras WHERE usuario_id = auth.uid())
    )
  )
  WITH CHECK (true);

-- ─────────────────────────────────────────────────
-- Storage bucket para fotos
-- ─────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-viajes', 'fotos-viajes', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated_upload_fotos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos-viajes');
CREATE POLICY "public_read_fotos" ON storage.objects
  FOR SELECT USING (bucket_id = 'fotos-viajes');
