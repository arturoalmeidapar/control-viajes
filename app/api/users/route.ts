import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // Verificar que el llamante sea admin
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: perfil } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { nombre, email, password, rol, obras } = await req.json()
  if (!nombre || !email || !password || !rol) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const adminClient = createAdminClient()

  // Crear usuario en Auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const userId = authData.user.id

  // Crear perfil en public.usuarios
  const { error: profileError } = await adminClient
    .from('usuarios')
    .insert({ id: userId, nombre, email, rol, activo: true })

  if (profileError) {
    // Limpiar usuario auth si falla el perfil
    await adminClient.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Asignar obras si es residente
  if (rol === 'residente' && obras?.length > 0) {
    await adminClient
      .from('residentes_obras')
      .insert(obras.map((obraId: string) => ({ usuario_id: userId, obra_id: obraId })))
  }

  return NextResponse.json({ ok: true, userId })
}
