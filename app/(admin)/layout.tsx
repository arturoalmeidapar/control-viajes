import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavAdmin } from '@/components/NavAdmin'
import { NavResidente } from '@/components/NavResidente'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol, puede_ver_todo')
    .eq('id', user.id)
    .single()

  if (perfil?.rol === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavAdmin />
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <NavResidente puedeVerTodo={perfil?.puede_ver_todo ?? false} />
      <main className="px-4 py-4">{children}</main>
    </div>
  )
}
