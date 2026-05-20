-- Agregar columna puede_ver_todo a public.usuarios
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS puede_ver_todo boolean NOT NULL DEFAULT false;
