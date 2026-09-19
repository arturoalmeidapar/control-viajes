import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardAdmin } from '@/components/admin/Dashboard'
import { inicioHoyMX, finHoyMX } from '@/lib/utils'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const inicioHoy = inicioHoyMX().toISOString()
  const finHoy = finHoyMX().toISOString()

  const [{ data: viajes }, { data: checadores }] = await Promise.all([
    supabase
      .from('viajes')
      .select('id, estado, m3, importe_calculado, tipo_material, created_at, checador_id, contratistas(nombre,codigo), unidades(tipo), obra_cobro:obras!viajes_obra_cobro_id_fkey(nombre)')
      .gte('created_at', inicioHoy)
      .lt('created_at', finHoy)
      .order('created_at', { ascending: false }),
    supabase.from('usuarios').select('id, nombre').eq('rol', 'checador').order('nombre'),
  ])

  return (
    <DashboardAdmin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viajes={(viajes ?? []) as any}
      checadores={checadores ?? []}
    />
  )
}
