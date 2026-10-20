// Limpieza de fotos antiguas del bucket "fotos-viajes".
//
// Borra los archivos de storage de los viajes anteriores a una fecha de corte
// y deja foto_url en NULL. Los registros de viajes NO se tocan en nada más.
//
// Uso:
//   node scripts/limpiar-fotos-antiguas.mjs              # muestra el conteo y pide confirmación
//   node scripts/limpiar-fotos-antiguas.mjs --dry        # solo muestra el conteo, no borra nada
//   node scripts/limpiar-fotos-antiguas.mjs --si         # ejecuta sin preguntar
//   node scripts/limpiar-fotos-antiguas.mjs --fecha=2026-07-01
//
// Requisito previo: aplicar supabase/migration-foto-url-nullable.sql
// (foto_url es NOT NULL en el esquema original).

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createInterface } from 'node:readline'

const BUCKET = 'fotos-viajes'
const ZONA_MX = 'America/Mazatlan'
const PAGINA = 1000
const LOTE_STORAGE = 100
const LOTE_UPDATE = 200

// ---------- argumentos ----------
const args = process.argv.slice(2)
const flag = n => args.includes(n)
const valor = (n, def) => {
  const a = args.find(x => x.startsWith(`${n}=`))
  return a ? a.slice(n.length + 1) : def
}

const FECHA_CORTE = valor('--fecha', '2026-07-01')
const SOLO_CONTEO = flag('--dry') || flag('--dry-run')
const SIN_PREGUNTAR = flag('--si') || flag('--yes')

if (!/^\d{4}-\d{2}-\d{2}$/.test(FECHA_CORTE)) {
  console.error(`❌ Fecha inválida: ${FECHA_CORTE} (formato esperado YYYY-MM-DD)`)
  process.exit(1)
}

// ---------- credenciales ----------
function cargarEnvLocal() {
  if (!existsSync('.env.local')) return
  for (const linea of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
cargarEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (revisa .env.local).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------- helpers ----------
/** Inicio del día `fecha` (YYYY-MM-DD) en horario de México, como instante UTC real. */
function inicioDiaMX(fecha) {
  const [year, month, day] = fecha.split('-').map(Number)
  const aprox = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_MX, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(aprox).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {})
  const comoUTC = Date.UTC(
    Number(partes.year), Number(partes.month) - 1, Number(partes.day),
    Number(partes.hour), Number(partes.minute), Number(partes.second),
  )
  const offsetMin = (comoUTC - aprox.getTime()) / 60000
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMin * 60000)
}

/** Extrae la ruta dentro del bucket a partir de la URL pública. */
function rutaDeUrl(url) {
  const marca = `/${BUCKET}/`
  const i = url.indexOf(marca)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marca.length).split('?')[0])
}

const trozos = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

function preguntar(texto) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(texto, respuesta => { rl.close(); resolve(respuesta.trim().toLowerCase()) })
  })
}

// ---------- main ----------
async function main() {
  const corte = inicioDiaMX(FECHA_CORTE)

  console.log(`Bucket:      ${BUCKET}`)
  console.log(`Corte:       viajes con created_at < ${FECHA_CORTE} 00:00 (${ZONA_MX}) = ${corte.toISOString()}`)
  console.log('Buscando viajes con foto...\n')

  const viajes = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from('viajes')
      .select('id, created_at, foto_url')
      .lt('created_at', corte.toISOString())
      .not('foto_url', 'is', null)
      .order('created_at', { ascending: true })
      .range(desde, desde + PAGINA - 1)
    if (error) {
      console.error(`❌ Error consultando viajes: ${error.message}`)
      process.exit(1)
    }
    viajes.push(...data)
    if (data.length < PAGINA) break
  }

  const conRuta = []
  const sinRuta = []
  for (const v of viajes) {
    const ruta = rutaDeUrl(v.foto_url)
    if (ruta) conRuta.push({ ...v, ruta })
    else sinRuta.push(v)
  }

  const rutas = [...new Set(conRuta.map(v => v.ruta))]

  console.log('──────────── Resumen ────────────')
  console.log(`Viajes anteriores a ${FECHA_CORTE} con foto: ${viajes.length}`)
  console.log(`Archivos a borrar del storage:            ${rutas.length}`)
  console.log(`Registros a dejar con foto_url = NULL:    ${conRuta.length}`)
  if (sinRuta.length) {
    console.log(`URLs no reconocidas (se omiten):          ${sinRuta.length}`)
  }
  if (viajes.length) {
    console.log(`Rango de fechas:                          ${viajes[0].created_at} → ${viajes[viajes.length - 1].created_at}`)
  }
  console.log('Los registros de viajes se conservan intactos (solo cambia foto_url).')
  console.log('─────────────────────────────────\n')

  if (viajes.length === 0) {
    console.log('✅ No hay fotos que borrar.')
    return
  }
  if (SOLO_CONTEO) {
    console.log('(--dry) No se borró nada.')
    return
  }

  if (!SIN_PREGUNTAR) {
    const r = await preguntar(`¿Borrar ${rutas.length} fotos del bucket "${BUCKET}"? Esta acción no se puede deshacer. [s/N]: `)
    if (r !== 's' && r !== 'si' && r !== 'sí') {
      console.log('Cancelado. No se borró nada.')
      return
    }
  }

  // Respaldo del mapeo id → foto_url antes de cualquier cambio
  const respaldo = `respaldo-foto-url-${FECHA_CORTE}-${Date.now()}.json`
  writeFileSync(respaldo, JSON.stringify(conRuta, null, 2))
  console.log(`\nRespaldo de id → foto_url: ${respaldo}`)

  // 1) foto_url = NULL (falla rápido si la migración no está aplicada, antes de borrar archivos)
  let actualizados = 0
  for (const lote of trozos(conRuta.map(v => v.id), LOTE_UPDATE)) {
    const { error, count } = await supabase
      .from('viajes')
      .update({ foto_url: null }, { count: 'exact' })
      .in('id', lote)
    if (error) {
      console.error(`\n❌ Error actualizando foto_url: ${error.message}`)
      if (/null value|not-null/i.test(error.message)) {
        console.error('   Aplica supabase/migration-foto-url-nullable.sql en el SQL Editor de Supabase y vuelve a ejecutar.')
      }
      console.error('   No se borró ningún archivo del storage.')
      process.exit(1)
    }
    actualizados += count ?? lote.length
    process.stdout.write(`\rfoto_url actualizados: ${actualizados}/${conRuta.length}`)
  }
  console.log('')

  // 2) borrar archivos del storage
  let borrados = 0
  const fallidos = []
  for (const lote of trozos(rutas, LOTE_STORAGE)) {
    const { data, error } = await supabase.storage.from(BUCKET).remove(lote)
    if (error) {
      fallidos.push(...lote)
      console.error(`\n⚠️  Error borrando un lote: ${error.message}`)
    } else {
      borrados += data?.length ?? 0
    }
    process.stdout.write(`\rArchivos borrados: ${borrados}/${rutas.length}`)
  }
  console.log('\n')

  console.log('✅ Limpieza terminada.')
  console.log(`   Archivos borrados:     ${borrados}/${rutas.length}`)
  console.log(`   foto_url en NULL:      ${actualizados}`)
  if (fallidos.length) {
    console.log(`   Archivos no borrados:  ${fallidos.length}`)
    console.log(`   Rutas pendientes guardadas en: ${respaldo}`)
  }
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
