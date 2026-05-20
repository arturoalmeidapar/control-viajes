import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardAdmin } from '@/components/admin/Dashboard'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
  const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString()

  const { data: viajes } = await supabase
    .from('viajes')
    .select('id, estado, m3, importe_calculado, tipo_material, created_at, contratistas(nombre,codigo), obras_destino:obras!viajes_obra_destino_id_fkey(nombre)')
    .gte('created_at', inicioHoy)
    .lte('created_at', finHoy)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <DashboardAdmin viajes={(viajes ?? []) as any} />
}
