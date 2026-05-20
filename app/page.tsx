import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { RolUsuario } from '@/lib/supabase/types'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = perfil?.rol as RolUsuario | undefined
  if (rol === 'admin') redirect('/dashboard')
  if (rol === 'checador') redirect('/checador')
  if (rol === 'residente') redirect('/residente')

  redirect('/login')
}
