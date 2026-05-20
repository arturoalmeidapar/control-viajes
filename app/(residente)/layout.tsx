import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavResidente } from '@/components/NavResidente'

export default async function ResidenteLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('puede_ver_todo')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <NavResidente puedeVerTodo={perfil?.puede_ver_todo ?? false} />
      <main className="px-4 py-4">{children}</main>
    </div>
  )
}
