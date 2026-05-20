/**
 * PRERREQUISITO: Ejecutar supabase/migration-puede-ver-todo.sql en Supabase SQL Editor antes de correr este script.
 *
 * Uso: node scripts/update-users.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno. Crea un archivo .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function listarUsuarios() {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`Error listando usuarios: ${error.message}`)
  return data.users
}

function encontrar(users, emailActual) {
  return users.find(u => u.email?.toLowerCase() === emailActual.toLowerCase())
}

async function actualizarUsuario(users, { emailActual, emailNuevo, password, nombre, puedeVerTodo = false }) {
  const user = encontrar(users, emailActual)
  if (!user) {
    console.log(`  ✗ No encontrado en Auth: ${emailActual}`)
    return
  }

  const { error: authErr } = await supabase.auth.admin.updateUserById(user.id, {
    email: emailNuevo,
    password,
  })
  if (authErr) {
    console.log(`  ✗ Error Auth (${emailActual}): ${authErr.message}`)
    return
  }

  const updates = { email: emailNuevo, nombre }
  const { error: dbErr } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('id', user.id)

  if (dbErr) {
    console.log(`  ✗ Error DB (${emailActual}): ${dbErr.message}`)
    return
  }

  // puede_ver_todo es columna nueva — actualizar por separado
  if (puedeVerTodo) {
    const { error: pvtErr } = await supabase
      .from('usuarios')
      .update({ puede_ver_todo: true })
      .eq('id', user.id)
    if (pvtErr) console.log(`  ! puede_ver_todo no aplicado (${nombre}): ${pvtErr.message}`)
    else console.log(`    → puede_ver_todo: true`)
  }

  console.log(`  ✓ ${nombre}: ${emailActual} → ${emailNuevo}`)
}

async function desactivarUsuario(users, email) {
  const user = encontrar(users, email)
  if (!user) {
    console.log(`  ✗ No encontrado en Auth: ${email}`)
    return
  }

  const { error } = await supabase
    .from('usuarios')
    .update({ activo: false })
    .eq('id', user.id)

  if (error) {
    console.log(`  ✗ Error desactivando ${email}: ${error.message}`)
    return
  }

  console.log(`  ✓ Desactivado: ${email}`)
}

async function crearMonicaSanchez(users) {
  const existente = encontrar(users, 'msanchez@qcabo.com')

  if (existente) {
    console.log('  ! Mónica ya existe en Auth — actualizando perfil...')
    await supabase
      .from('usuarios')
      .upsert({ id: existente.id, nombre: 'Mónica Sánchez', email: 'Msanchez@qcabo.com', rol: 'residente', activo: true, puede_ver_todo: true }, { onConflict: 'id' })
    console.log('  ✓ Perfil de Mónica actualizado')
    return
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: 'Msanchez@qcabo.com',
    password: 'Msanchez',
    email_confirm: true,
  })

  if (error) {
    console.log(`  ✗ Error creando Mónica: ${error.message}`)
    return
  }

  const { error: dbErr } = await supabase.from('usuarios').insert({
    id: data.user.id,
    nombre: 'Mónica Sánchez',
    email: 'Msanchez@qcabo.com',
    rol: 'residente',
    activo: true,
  })

  if (dbErr) {
    console.log(`  ✗ Error perfil Mónica: ${dbErr.message}`)
    return
  }

  // puede_ver_todo por separado
  const { error: pvtErr } = await supabase
    .from('usuarios')
    .update({ puede_ver_todo: true })
    .eq('id', data.user.id)
  if (pvtErr) console.log(`  ! puede_ver_todo no aplicado (Mónica): ${pvtErr.message}`)
  else console.log('    → puede_ver_todo: true')

  console.log('  ✓ Mónica Sánchez creada')
}

async function main() {
  console.log('Cargando usuarios de Auth...')
  const users = await listarUsuarios()
  console.log(`  ${users.length} usuarios encontrados\n`)

  console.log('Actualizando usuarios existentes...')
  await actualizarUsuario(users, {
    emailActual: 'arturo.almeidapar@gmail.com',
    emailNuevo: 'aalmeida@qcabo.com',
    password: 'aalmeida',
    nombre: 'Arturo Almeida',
  })
  await actualizarUsuario(users, {
    emailActual: 'fernando.santiago@residente.local',
    emailNuevo: 'fsantiago@qcabo.com',
    password: 'fsantiago',
    nombre: 'Fernando Santiago Arias',
  })
  await actualizarUsuario(users, {
    emailActual: 'aaron.nunez@residente.local',
    emailNuevo: 'aaragon@qcabo.com',
    password: 'aaragon',
    nombre: 'Aaron Nuñez',
  })
  await actualizarUsuario(users, {
    emailActual: 'luis.garrido@residente.local',
    emailNuevo: 'lgarrido@qcabo.com',
    password: 'lgarrido',
    nombre: 'Luis Garrido',
  })
  await actualizarUsuario(users, {
    emailActual: 'angel.canedo@residente.local',
    emailNuevo: 'ameza@qcabo.com',
    password: 'ameza',
    nombre: 'Angel Meza',
  })
  await actualizarUsuario(users, {
    emailActual: 'isidro.rubio@residente.local',
    emailNuevo: 'ltorres@qcabo.com',
    password: 'ltorres',
    nombre: 'Luis Torres',
    puedeVerTodo: true,
  })

  console.log('\nDesactivando usuarios...')
  await desactivarUsuario(users, 'thomas.ayon@residente.local')

  console.log('\nCreando Mónica Sánchez...')
  await crearMonicaSanchez(users)

  console.log('\n✅ Completado.')
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
