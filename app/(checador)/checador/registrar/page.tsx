import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RegistrarViaje } from '@/components/checador/RegistrarViaje'

export default async function RegistrarPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: contratistas },
    { data: unidades },
    { data: obras },
    { data: distancias },
    { data: tarifas },
  ] = await Promise.all([
    supabase.from('contratistas').select('*').eq('activo', true).order('nombre'),
    supabase.from('unidades').select('*').eq('activo', true).order('identificador'),
    supabase.from('obras').select('*').eq('activo', true).order('nombre'),
    supabase.from('distancias').select('*'),
    supabase.from('tarifas').select('*'),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Registrar Viaje</h1>
      <RegistrarViaje
        contratistas={contratistas ?? []}
        unidades={unidades ?? []}
        obras={obras ?? []}
        distancias={distancias ?? []}
        tarifas={tarifas ?? []}
        checadorId={user.id}
      />
    </div>
  )
}
