import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavAdmin } from '@/components/NavAdmin'
import { NavResidente } from '@/components/NavResidente'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Primero obtenemos el rol (query mínima, siempre funciona)
  const { data: perfilBase } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  // Intentamos obtener puede_ver_todo por separado (columna puede no existir en todos los entornos)
  const { data: perfilExtra } = await supabase
    .from('usuarios')
    .select('puede_ver_todo')
    .eq('id', user.id)
    .single()

  const rol = perfilBase?.rol
  const puedeVerTodo = perfilExtra?.puede_ver_todo ?? false

  if (rol === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavAdmin />
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <NavResidente puedeVerTodo={puedeVerTodo} />
      <main className="px-4 py-4">{children}</main>
    </div>
  )
}
