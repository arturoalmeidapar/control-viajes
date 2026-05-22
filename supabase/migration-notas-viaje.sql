-- Agregar columna notas a la tabla viajes
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS notas TEXT;
