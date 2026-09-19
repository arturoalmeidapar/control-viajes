import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ViajesAdmin } from '@/components/admin/ViajesList'

export const revalidate = 0

export default async function ViajesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: obras },
    { data: contratistas },
    { data: unidades },
    { data: distancias },
    { data: tarifas },
    { data: perfil },
    { data: checadores },
  ] = await Promise.all([
    supabase.from('obras').select('*').eq('activo', true).order('nombre'),
    supabase.from('contratistas').select('*').eq('activo', true).order('nombre'),
    supabase.from('unidades').select('*').eq('activo', true).order('identificador'),
    supabase.from('distancias').select('*'),
    supabase.from('tarifas').select('*'),
    supabase.from('usuarios').select('rol').eq('id', user.id).single(),
    supabase.from('usuarios').select('id, nombre').eq('rol', 'checador').order('nombre'),
  ])

  return (
    <ViajesAdmin
      obras={obras ?? []}
      contratistas={contratistas ?? []}
      unidades={unidades ?? []}
      distancias={distancias ?? []}
      tarifas={tarifas ?? []}
      checadores={checadores ?? []}
      adminId={user.id}
      esAdmin={perfil?.rol === 'admin'}
    />
  )
}
