import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

// Cron mensual de Vercel (ver vercel.json: día 1 de cada mes).
// Borra del bucket "fotos-viajes" las fotos de viajes con más de MESES_RETENCION
// meses de antigüedad y deja foto_url en NULL. Los registros de viajes no se
// tocan en nada más. Reutiliza la misma lógica que scripts/limpiar-fotos-antiguas.mjs.
//
// Protegido con CRON_SECRET: Vercel firma las invocaciones de cron con
// `Authorization: Bearer <CRON_SECRET>` cuando esa variable de entorno existe
// en el proyecto. Sin ese secreto configurado, cualquier llamada se rechaza.

export const runtime = 'nodejs'
export const maxDuration = 300

const BUCKET = 'fotos-viajes'
const ZONA_MX = 'America/Mazatlan'
const MESES_RETENCION = 2
const PAGINA = 1000
const LOTE_STORAGE = 100
const LOTE_UPDATE = 200

function partesFecha(instante: Date, opciones: Intl.DateTimeFormatOptions): Record<string, string> {
  return new Intl.DateTimeFormat('en-US', { timeZone: ZONA_MX, hourCycle: 'h23', ...opciones })
    .formatToParts(instante)
    .reduce((acc, p) => { if (p.type !== 'literal') acc[p.type] = p.value; return acc }, {} as Record<string, string>)
}

/** Instante UTC real de la medianoche del día (year,month,day) en horario de México. */
function inicioDiaMX(year: number, month: number, day: number): Date {
  const aprox = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const partes = partesFecha(aprox, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const comoUTC = Date.UTC(
    Number(partes.year), Number(partes.month) - 1, Number(partes.day),
    Number(partes.hour), Number(partes.minute), Number(partes.second),
  )
  const offsetMin = (comoUTC - aprox.getTime()) / 60000
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMin * 60000)
}

/** Primer día del mes actual (MX) menos `meses` meses, como instante UTC real de medianoche MX. */
function corteMesesAtras(meses: number, referencia: Date): Date {
  const partes = partesFecha(referencia, { year: 'numeric', month: '2-digit' })
  const year = Number(partes.year)
  const month = Number(partes.month) // 1-12
  // Date.UTC normaliza un índice de mes negativo pasando al/los año(s) anterior(es).
  const d = new Date(Date.UTC(year, month - 1 - meses, 1))
  return inicioDiaMX(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
}

/** Extrae la ruta dentro del bucket a partir de la URL pública. */
function rutaDeUrl(url: string): string | null {
  const marca = `/${BUCKET}/`
  const i = url.indexOf(marca)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marca.length).split('?')[0])
}

function trozos<T>(arr: T[], n: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))
}

async function notificarAdmins(supabase: ReturnType<typeof createAdminClient>, resumen: {
  corte: string; viajesEncontrados: number; archivosBorrados: number; archivosFallidos: number
}) {
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? 'mailto:admin@control-viajes.app',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
    const { data: admins } = await supabase
      .from('usuarios')
      .select('push_subscription')
      .eq('rol', 'admin')
      .not('push_subscription', 'is', null)

    const cuerpo = resumen.archivosFallidos > 0
      ? `${resumen.archivosBorrados} fotos borradas, ${resumen.archivosFallidos} fallaron (antes de ${resumen.corte})`
      : `${resumen.archivosBorrados} fotos borradas (antes de ${resumen.corte})`

    for (const a of (admins ?? []) as { push_subscription: Record<string, unknown> | null }[]) {
      if (!a.push_subscription) continue
      try {
        await webpush.sendNotification(
          a.push_subscription as unknown as webpush.PushSubscription,
          JSON.stringify({ title: 'Limpieza automática de fotos', body: cuerpo, url: '/admin' })
        )
      } catch {
        // Suscripción expirada o inválida — ignorar
      }
    }
  } catch (e) {
    console.error('[limpiar-fotos] Error enviando notificación push:', e)
  }
}

async function ejecutarLimpieza() {
  const supabase = createAdminClient()
  const corte = corteMesesAtras(MESES_RETENCION, new Date())

  console.log(`[limpiar-fotos] Corte: viajes con created_at < ${corte.toISOString()} (más de ${MESES_RETENCION} meses de antigüedad)`)

  const viajes: { id: string; created_at: string; foto_url: string }[] = []
  for (let offset = 0; ; offset += PAGINA) {
    const { data, error } = await supabase
      .from('viajes')
      .select('id, created_at, foto_url')
      .lt('created_at', corte.toISOString())
      .not('foto_url', 'is', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGINA - 1)
    if (error) throw new Error(`Consultando viajes: ${error.message}`)
    viajes.push(...(data as typeof viajes))
    if (!data || data.length < PAGINA) break
  }

  const conRuta = viajes
    .map(v => ({ ...v, ruta: rutaDeUrl(v.foto_url) }))
    .filter((v): v is typeof viajes[number] & { ruta: string } => v.ruta !== null)
  const rutas = Array.from(new Set(conRuta.map(v => v.ruta)))

  console.log(`[limpiar-fotos] Viajes encontrados: ${viajes.length}, archivos a borrar: ${rutas.length}`)

  if (viajes.length === 0) {
    return { corte, viajesEncontrados: 0, archivosBorrados: 0, archivosFallidos: 0, fotoUrlLimpiados: 0 }
  }

  // 1) foto_url = NULL antes de borrar archivos (si esto falla, no se borra nada del storage)
  let actualizados = 0
  for (const lote of trozos(conRuta.map(v => v.id), LOTE_UPDATE)) {
    const { error, count } = await supabase
      .from('viajes')
      .update({ foto_url: null }, { count: 'exact' })
      .in('id', lote)
    if (error) throw new Error(`Actualizando foto_url: ${error.message}`)
    actualizados += count ?? lote.length
  }

  // 2) borrar archivos del storage
  let borrados = 0
  let fallidos = 0
  for (const lote of trozos(rutas, LOTE_STORAGE)) {
    const { data, error } = await supabase.storage.from(BUCKET).remove(lote)
    if (error) {
      fallidos += lote.length
      console.error(`[limpiar-fotos] Error borrando un lote de storage: ${error.message}`)
    } else {
      borrados += data?.length ?? 0
    }
  }

  console.log(`[limpiar-fotos] Resultado: ${borrados}/${rutas.length} archivos borrados, ${actualizados} foto_url en NULL`)

  return { corte, viajesEncontrados: viajes.length, archivosBorrados: borrados, archivosFallidos: fallidos, fotoUrlLimpiados: actualizados }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  let resultado: Awaited<ReturnType<typeof ejecutarLimpieza>> | null = null
  let error: string | null = null

  try {
    resultado = await ejecutarLimpieza()
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
    console.error('[limpiar-fotos] Error en la limpieza:', error)
  }

  // Log persistente del resultado (tabla limpieza_fotos_log — ver migration-limpieza-fotos-log.sql)
  const { error: logError } = await supabase.from('limpieza_fotos_log').insert({
    corte: (resultado?.corte ?? new Date()).toISOString(),
    viajes_encontrados: resultado?.viajesEncontrados ?? 0,
    archivos_borrados: resultado?.archivosBorrados ?? 0,
    archivos_fallidos: resultado?.archivosFallidos ?? 0,
    foto_url_limpiados: resultado?.fotoUrlLimpiados ?? 0,
    error,
  })
  if (logError) console.error('[limpiar-fotos] Error guardando el log:', logError.message)

  if (resultado && resultado.archivosBorrados > 0) {
    await notificarAdmins(supabase, {
      corte: resultado.corte.toISOString().slice(0, 10),
      viajesEncontrados: resultado.viajesEncontrados,
      archivosBorrados: resultado.archivosBorrados,
      archivosFallidos: resultado.archivosFallidos,
    })
  }

  if (error) return NextResponse.json({ ok: false, error }, { status: 500 })
  return NextResponse.json({ ok: true, ...resultado })
}
