import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EstimacionSemanal } from '@/components/admin/EstimacionSemanal'

export const revalidate = 0

export default async function EstimacionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol, puede_ver_todo')
    .eq('id', user.id)
    .single()

  // Residente sin puede_ver_todo: filtrar a sus obras asignadas
  let obrasFiltro: string[] | undefined = undefined
  if (perfil?.rol === 'residente' && !perfil?.puede_ver_todo) {
    const { data: asignaciones } = await supabase
      .from('residentes_obras')
      .select('obra_id')
      .eq('usuario_id', user.id)
    obrasFiltro = (asignaciones ?? []).map(a => a.obra_id)
  }

  return <EstimacionSemanal obrasFiltro={obrasFiltro} />
}
