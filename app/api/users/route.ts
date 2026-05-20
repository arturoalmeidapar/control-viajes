import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function verificarAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  return perfil?.rol === 'admin' ? user : null
}

export async function PATCH(req: Request) {
  const admin = await verificarAdmin()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { userId, nombre, email, rol, activo, password, obras } = await req.json()
  if (!userId || !nombre || !email || !rol) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const adminClient = createAdminClient()

  // Actualizar email y/o contraseña en auth.users
  const authUpdates: { email?: string; password?: string } = { email }
  if (password) authUpdates.password = password

  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, authUpdates)
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // Actualizar perfil en public.usuarios
  const { error: profileError } = await adminClient
    .from('usuarios')
    .update({ nombre, email, rol, activo })
    .eq('id', userId)
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  // Actualizar obras asignadas si es residente
  if (rol === 'residente') {
    await adminClient.from('residentes_obras').delete().eq('usuario_id', userId)
    if (obras?.length > 0) {
      await adminClient.from('residentes_obras').insert(
        obras.map((obraId: string) => ({ usuario_id: userId, obra_id: obraId }))
      )
    }
  }

  return NextResponse.json({ ok: true })
}

export async function POST(req: Request) {
  const admin = await verificarAdmin()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

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
