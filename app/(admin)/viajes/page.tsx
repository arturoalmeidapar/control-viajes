import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ViajesAdmin } from '@/components/admin/ViajesList'

export const revalidate = 0

export default async function ViajesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: obras }, { data: contratistas }] = await Promise.all([
    supabase.from('obras').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('contratistas').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  return <ViajesAdmin obrasOpciones={obras ?? []} contratistasOpciones={contratistas ?? []} />
}
