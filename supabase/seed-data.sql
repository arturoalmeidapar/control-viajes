-- ============================================================
-- SEED DATA — Control Viajes URB Los Cabos
-- Solo datos de referencia (sin usuarios auth)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

DO $$
DECLARE
  c_abr     uuid; c_lomas   uuid; c_icb     uuid; c_osiris  uuid;
  c_adol    uuid; c_tredi   uuid; c_uhno    uuid; c_rame    uuid;
  c_mafe    uuid; c_gl      uuid; c_spe     uuid; c_retrock uuid;

  o_mant uuid; o_lago2  uuid; o_canchas uuid; o_blvd  uuid;
  o_cas5 uuid; o_ver2   uuid; o_amen   uuid; o_urb2  uuid;
  o_mont uuid; o_sec3   uuid; o_casmnt uuid; o_estaox uuid;
  o_rmtr uuid; o_parq   uuid; o_lago13 uuid; o_tiro  uuid;
  o_29ac uuid; o_29d    uuid; o_camol  uuid; o_golf  uuid;
  o_cs1  uuid; o_cs2    uuid; o_cs3    uuid;

BEGIN

-- ─────────────────────────────────────────────────
-- CONTRATISTAS
-- ─────────────────────────────────────────────────

INSERT INTO contratistas (nombre, codigo, tarifa_especial) VALUES ('ANDRÉS ABELARDO', 'ABR', false) RETURNING id INTO c_abr;
INSERT INTO contratistas (nombre, codigo, tarifa_especial) VALUES ('PAREDES', 'LOMAS REAL', false) RETURNING id INTO c_lomas;
INSERT INTO contratistas (nombre, codigo, tarifa_especial) VALUES ('ENRIQUE CASTILLO', 'ICB', false) RETURNING id INTO c_icb;
INSERT INTO contratistas (nombre, codigo, tarifa_especial) VALUES ('OSIRIS GUERRERO LAFARGA', 'OSIRIS', true) RETURNING id INTO c_osiris;
INSERT INTO contratistas (nombre, codigo, tarifa_especial) VALUES ('ADOLESTIC', 'ADOLESTIC', false) RETURNING id INTO c_adol;
INSERT INTO contratistas (nombre, codigo, tarifa_especial) VALUES ('TREDI', 'TREDI', false) RETURNING id INTO c_tredi;
INSERT INTO contratistas (nombre, codigo, tarifa_especial) VALUES ('ANTONIO CESEÑA', 'UHNO', false) RETURNING id INTO c_uhno;
INSERT INTO contratistas (nombre, codigo, tarifa_especial) VALUES ('RAÚL VERDUGO', 'RAME', false) RETURNING id INTO c_rame;
INSERT INTO contratistas (nombre, codigo, tarifa_especial) VALUES ('MARÍN AGRAMON', 'MAFE', false) RETURNING id INTO c_mafe;
INSERT INTO contratistas (nombre, codigo, tarifa_especial) VALUES ('ESTER GASPAR', 'GL PIEDRA', false) RETURNING id INTO c_gl;
INSERT INTO contratistas (nombre, codigo, tarifa_especial) VALUES ('IGAL CASTRO', 'SPE', false) RETURNING id INTO c_spe;
INSERT INTO contratistas (nombre, codigo, tarifa_especial) VALUES ('PIERRE MICHEL', 'RETROCK', false) RETURNING id INTO c_retrock;

-- ─────────────────────────────────────────────────
-- UNIDADES
-- ─────────────────────────────────────────────────

INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_abr, 'T680 KW rojo', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_abr, 'Freightliner blanco', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_abr, 'Cremita', 'camion');

INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_lomas, 'D2', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_lomas, 'D9', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_lomas, 'D10', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_lomas, 'D11', 'camion');

INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_icb, '1 azul', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_icb, 'Naranja', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_icb, 'Chevrolet', 'pipa');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_icb, 'Blanca', 'pipa');

INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, '01', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, '02', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, '03', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, '05', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, '06', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, '08', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, '11', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, '13', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, '15', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, 'Amarilla', 'pipa');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, 'Sterling', 'pipa');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, 'Aguilita', 'pipa');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, '10', 'pipa');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, 'Pro Star gris', 'pipa');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_adol, 'Peterbilt morada', 'pipa');

INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_tredi, 'Cascadia amarillo', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_tredi, '8 rojo Wester', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo, capacidad_m3) VALUES (c_tredi, 'Kenworth amarilla', 'pipa', 18);
INSERT INTO unidades (contratista_id, identificador, tipo, capacidad_m3) VALUES (c_tredi, 'Cascadia blanca', 'pipa', 18);

INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_uhno, 'UHNO', 'camion');

INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_rame, 'Isidro', 'pipa');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_rame, 'Azul 20', 'pipa');

INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_mafe, 'Pro Star blanco', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_mafe, 'KW blanco', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_mafe, 'Pro Star guinda', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_mafe, 'Cascadia blanco', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_mafe, 'Internacional 10', 'pipa');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_mafe, 'Internacional 16', 'pipa');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_mafe, 'Transtar gris', 'pipa');

INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_gl, '01', 'pipa');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_gl, '02', 'pipa');

INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_spe, 'Azul', 'pipa');

INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_retrock, 'Palomo', 'camion');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_retrock, 'Amarilla', 'pipa');
INSERT INTO unidades (contratista_id, identificador, tipo) VALUES (c_retrock, 'Blanca', 'pipa');

-- ─────────────────────────────────────────────────
-- OBRAS
-- ─────────────────────────────────────────────────

INSERT INTO obras (nombre, es_campo_golf) VALUES ('Infra Edificio Mantenimiento', false) RETURNING id INTO o_mant;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Lago 2da Fase', false) RETURNING id INTO o_lago2;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Urb Canchas Club Fase 2', false) RETURNING id INTO o_canchas;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Infra Boulevard Fase II', false) RETURNING id INTO o_blvd;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Infra Casitas Fase II Sección 5', false) RETURNING id INTO o_cas5;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Infra Verandas II', false) RETURNING id INTO o_ver2;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Urb Amenidades', false) RETURNING id INTO o_amen;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Urbanización Fase II', false) RETURNING id INTO o_urb2;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Infra La Montaña', false) RETURNING id INTO o_mont;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Urb Sección 3', false) RETURNING id INTO o_sec3;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Infra Casitas Montaña', false) RETURNING id INTO o_casmnt;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Estacionamiento Aux OR', false) RETURNING id INTO o_estaox;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('R&M Trails', false) RETURNING id INTO o_rmtr;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Urb El Parque Fase II', false) RETURNING id INTO o_parq;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Infra Lago (Sección 13)', false) RETURNING id INTO o_lago13;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Tiro Práctica Q2', false) RETURNING id INTO o_tiro;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Urb Sección 29A-C', false) RETURNING id INTO o_29ac;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Urb Sección 29D', false) RETURNING id INTO o_29d;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Urbanización General (Camino del olvido)', false) RETURNING id INTO o_camol;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Campo de Golf Q2', true) RETURNING id INTO o_golf;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Infra Comfort Station 1', false) RETURNING id INTO o_cs1;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Infra Comfort Station 2', false) RETURNING id INTO o_cs2;
INSERT INTO obras (nombre, es_campo_golf) VALUES ('Infra Comfort Station 3', false) RETURNING id INTO o_cs3;

-- ─────────────────────────────────────────────────
-- DISTANCIAS
-- ─────────────────────────────────────────────────

INSERT INTO distancias (obra_origen_id, obra_destino_id, distancia_km, nota) VALUES (o_lago2, o_canchas, 1, NULL);
INSERT INTO distancias (obra_origen_id, obra_destino_id, distancia_km, nota) VALUES (o_29ac, o_golf, 1, 'hoyo 16');
INSERT INTO distancias (obra_origen_id, obra_destino_id, distancia_km, nota) VALUES (o_mont, o_sec3, 2, NULL);
INSERT INTO distancias (obra_origen_id, obra_destino_id, distancia_km, nota) VALUES (o_29ac, o_camol, 2, NULL);
INSERT INTO distancias (obra_origen_id, obra_destino_id, distancia_km, nota) VALUES (o_29ac, o_golf, 2, 'hoyo 1');
INSERT INTO distancias (obra_origen_id, obra_destino_id, distancia_km, nota) VALUES (o_urb2, o_golf, 2, 'hoyo 14');
INSERT INTO distancias (obra_origen_id, obra_destino_id, distancia_km, nota) VALUES (o_mont, o_blvd, 4, NULL);
INSERT INTO distancias (obra_origen_id, obra_destino_id, distancia_km, nota) VALUES (o_camol, o_golf, 4, 'hoyo 18');

-- ─────────────────────────────────────────────────
-- TARIFAS
-- ─────────────────────────────────────────────────

INSERT INTO tarifas (tipo_material, precio_m3, precio_km_adicional, km_base) VALUES ('desmonte', 30.00, 14.00, 3);
INSERT INTO tarifas (tipo_material, precio_m3, precio_km_adicional, km_base) VALUES ('material', 30.00, 14.00, 3);
INSERT INTO tarifas (tipo_material, precio_m3, precio_km_adicional, km_base) VALUES ('agua', 96.00, 0.00, 0);
INSERT INTO tarifas (tipo_material, precio_m3, precio_km_adicional, km_base) VALUES ('basura', 300.00, 0.00, 0);

INSERT INTO tarifas (tipo_material, precio_m3, precio_km_adicional, km_base, solo_contratista_id) VALUES ('desmonte', 28.00, 12.00, 3, c_osiris);
INSERT INTO tarifas (tipo_material, precio_m3, precio_km_adicional, km_base, solo_contratista_id) VALUES ('material', 28.00, 12.00, 3, c_osiris);
INSERT INTO tarifas (tipo_material, precio_m3, precio_km_adicional, km_base, solo_contratista_id) VALUES ('agua', 90.00, 0.00, 0, c_osiris);

END $$;
