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
  ] = await Promise.all([
    supabase.from('obras').select('*').eq('activo', true).order('nombre'),
    supabase.from('contratistas').select('*').eq('activo', true).order('nombre'),
    supabase.from('unidades').select('*').eq('activo', true).order('identificador'),
    supabase.from('distancias').select('*'),
    supabase.from('tarifas').select('*'),
    supabase.from('usuarios').select('rol').eq('id', user.id).single(),
  ])

  return (
    <ViajesAdmin
      obras={obras ?? []}
      contratistas={contratistas ?? []}
      unidades={unidades ?? []}
      distancias={distancias ?? []}
      tarifas={tarifas ?? []}
      adminId={user.id}
      esAdmin={perfil?.rol === 'admin'}
    />
  )
}
