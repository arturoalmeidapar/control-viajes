// Ejecutar con: node scripts/seed-users.mjs
// Crea los usuarios de auth + perfiles + asignaciones de obras

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function crearUsuario(email, password, nombre, rol) {
  // Verificar si ya existe
  const { data: existing } = await supabase.auth.admin.listUsers()
  const existe = existing?.users?.find(u => u.email === email)

  let userId
  if (existe) {
    console.log(`  ✓ Ya existe: ${email}`)
    userId = existe.id
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw new Error(`Error creando ${email}: ${error.message}`)
    userId = data.user.id
    console.log(`  + Creado: ${email}`)
  }

  // Upsert perfil en public.usuarios
  const { error: profileError } = await supabase
    .from('usuarios')
    .upsert({ id: userId, nombre, email, rol, activo: true }, { onConflict: 'id' })
  if (profileError) throw new Error(`Error perfil ${email}: ${profileError.message}`)

  return userId
}

async function asignarObras(userId, nombreObras) {
  // Obtener IDs de obras por nombre
  const { data: obras, error } = await supabase
    .from('obras')
    .select('id, nombre')
    .in('nombre', nombreObras)
  if (error) throw new Error(`Error buscando obras: ${error.message}`)

  for (const obra of obras) {
    const { error: e } = await supabase
      .from('residentes_obras')
      .upsert({ usuario_id: userId, obra_id: obra.id }, { onConflict: 'usuario_id,obra_id' })
    if (e) throw new Error(`Error asignando obra ${obra.nombre}: ${e.message}`)
  }
  console.log(`    Obras asignadas: ${obras.map(o => o.nombre).join(', ')}`)
}

async function main() {
  console.log('Creando usuarios...\n')

  // Arturo Almeida — admin
  const uArturo = await crearUsuario(
    'arturo.almeidapar@gmail.com', 'Admin2024!',
    'Arturo Almeida', 'admin'
  )
  await asignarObras(uArturo, [
    'Campo de Golf Q2',
    'Infra Comfort Station 1',
    'Infra Comfort Station 2',
    'Infra Comfort Station 3',
  ])

  // Fernando Santiago Arias — residente
  const uFernando = await crearUsuario(
    'fernando.santiago@residente.local', 'Residente2024!',
    'Fernando Santiago Arias', 'residente'
  )
  await asignarObras(uFernando, [
    'Infra Edificio Mantenimiento',
    'Lago 2da Fase',
  ])

  // Aaron Nuñez — residente
  const uAaron = await crearUsuario(
    'aaron.nunez@residente.local', 'Residente2024!',
    'Aaron Nuñez', 'residente'
  )
  await asignarObras(uAaron, [
    'Urb Canchas Club Fase 2',
    'Infra Boulevard Fase II',
    'Infra Casitas Fase II Sección 5',
    'Infra Verandas II',
    'Urb Amenidades',
    'Urbanización Fase II',
  ])

  // Luis Garrido — residente
  const uLuis = await crearUsuario(
    'luis.garrido@residente.local', 'Residente2024!',
    'Luis Garrido', 'residente'
  )
  await asignarObras(uLuis, [
    'Infra La Montaña',
    'Urb Sección 3',
    'Infra Casitas Montaña',
    'Estacionamiento Aux OR',
    'R&M Trails',
    'Urb El Parque Fase II',
    'Infra Lago (Sección 13)',
    'Tiro Práctica Q2',
  ])

  // Isidro Rubio — residente
  const uIsidro = await crearUsuario(
    'isidro.rubio@residente.local', 'Residente2024!',
    'Isidro Rubio', 'residente'
  )
  await asignarObras(uIsidro, [
    'Urb Sección 29A-C',
    'Urb Sección 29D',
  ])

  // Thomas Ayón — residente
  const uThomas = await crearUsuario(
    'thomas.ayon@residente.local', 'Residente2024!',
    'Thomas Ayón', 'residente'
  )
  await asignarObras(uThomas, [
    'Urb Sección 29D',
  ])

  // Angel Cañedo — residente
  const uAngel = await crearUsuario(
    'angel.canedo@residente.local', 'Residente2024!',
    'Angel Cañedo', 'residente'
  )
  await asignarObras(uAngel, [
    'Urbanización General (Camino del olvido)',
  ])

  // Checador por defecto
  await crearUsuario(
    'checador@control-viajes.local', 'Checador2024!',
    'Checador', 'checador'
  )

  console.log('\n✅ Todos los usuarios creados correctamente.')
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
