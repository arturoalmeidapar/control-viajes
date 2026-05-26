import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatFecha } from '@/lib/utils'

export const revalidate = 0

interface ViajeResumen {
  id: string
  tipo_material: string
  m3: number
  contratista_id: string
  obra_origen_id: string
  obra_destino_id: string | null
  obra_cobro_id: string | null
  zona_destino: string | null
  contratistas: { nombre: string } | null
  obras_origen: { nombre: string } | null
  obras_destino: { nombre: string } | null
  obra_cobro: { nombre: string } | null
}

interface GrupoObra {
  obraId: string | null
  obraNombre: string
  residente: string
  m3Total: number
  viajesCount: number
  contratistas: Record<string, {
    nombre: string
    materiales: Record<string, { count: number; m3: number }>
  }>
}

function agruparPorObra(
  viajes: ViajeResumen[],
  getObraId: (v: ViajeResumen) => string | null,
  getObraNombre: (v: ViajeResumen) => string,
  residenteMap: Record<string, string>
): GrupoObra[] {
  const grupos: Record<string, GrupoObra> = {}

  for (const v of viajes) {
    const obraId = getObraId(v) ?? 'sin-obra'
    const obraNombre = getObraNombre(v)
    const contNombre = v.contratistas?.nombre ?? '-'

    if (!grupos[obraId]) {
      grupos[obraId] = {
        obraId: getObraId(v),
        obraNombre,
        residente: residenteMap[obraId] ?? '—',
        m3Total: 0,
        viajesCount: 0,
        contratistas: {},
      }
    }

    grupos[obraId].m3Total += v.m3
    grupos[obraId].viajesCount++

    if (!grupos[obraId].contratistas[contNombre]) {
      grupos[obraId].contratistas[contNombre] = { nombre: contNombre, materiales: {} }
    }
    if (!grupos[obraId].contratistas[contNombre].materiales[v.tipo_material]) {
      grupos[obraId].contratistas[contNombre].materiales[v.tipo_material] = { count: 0, m3: 0 }
    }
    grupos[obraId].contratistas[contNombre].materiales[v.tipo_material].count++
    grupos[obraId].contratistas[contNombre].materiales[v.tipo_material].m3 += v.m3
  }

  return Object.values(grupos).sort((a, b) => a.obraNombre.localeCompare(b.obraNombre))
}

const CHIP_MATERIAL: Record<string, string> = {
  material: 'bg-blue-100 text-blue-700',
  agua: 'bg-cyan-100 text-cyan-700',
  desmonte: 'bg-orange-100 text-orange-700',
  basura: 'bg-red-100 text-red-700',
}
const LABEL_MATERIAL: Record<string, string> = {
  material: 'Material',
  agua: 'Agua',
  desmonte: 'Desmonte',
  basura: 'Basura',
}

export default async function ResumenPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
  const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString()

  const { data } = await supabase
    .from('viajes')
    .select(`
      id, tipo_material, m3, contratista_id, obra_origen_id, obra_destino_id, obra_cobro_id, zona_destino,
      contratistas(nombre),
      obras_origen:obras!viajes_obra_origen_id_fkey(nombre),
      obras_destino:obras!viajes_obra_destino_id_fkey(nombre),
      obra_cobro:obras!viajes_obra_cobro_id_fkey(nombre)
    `)
    .eq('checador_id', user.id)
    .gte('created_at', inicioHoy)
    .lte('created_at', finHoy)
    .order('created_at', { ascending: false })

  const viajes = (data ?? []) as unknown as ViajeResumen[]

  // Recopilar IDs de obras relevantes para buscar residentes
  const obraIdsSet = new Set<string>()
  for (const v of viajes) {
    const cobroId = v.obra_cobro_id ?? (['desmonte', 'basura'].includes(v.tipo_material) ? v.obra_origen_id : v.obra_destino_id)
    if (cobroId) obraIdsSet.add(cobroId)
  }
  const obraIds = Array.from(obraIdsSet)

  const residenteMap: Record<string, string> = {}
  if (obraIds.length > 0) {
    const { data: asigs } = await supabase
      .from('residentes_obras')
      .select('obra_id, usuarios(nombre)')
      .in('obra_id', obraIds)

    for (const a of (asigs ?? []) as unknown as { obra_id: string; usuarios: { nombre: string } | null }[]) {
      if (!residenteMap[a.obra_id] && a.usuarios?.nombre) {
        residenteMap[a.obra_id] = a.usuarios.nombre
      }
    }
  }

  // Separar por tipo
  const viajesMaterialAgua = viajes.filter(v => ['material', 'agua'].includes(v.tipo_material))
  const viajesDesmonte = viajes.filter(v => v.tipo_material === 'desmonte')
  const viajesBasura = viajes.filter(v => v.tipo_material === 'basura')

  // Stats
  const totalViajes = viajes.length
  const m3Total = viajes.reduce((s, v) => s + v.m3, 0)

  const obrasActivasSet = new Set<string>()
  for (const v of viajes) {
    const id = v.obra_cobro_id ?? (['desmonte', 'basura'].includes(v.tipo_material) ? v.obra_origen_id : v.obra_destino_id)
    if (id) obrasActivasSet.add(id)
  }
  const obrasActivas = obrasActivasSet.size

  const notasSet = new Set<string>()
  for (const v of viajes) {
    const obraCobroId = v.obra_cobro_id ?? (['desmonte', 'basura'].includes(v.tipo_material) ? v.obra_origen_id : v.obra_destino_id)
    notasSet.add(`${v.contratista_id}||${obraCobroId}`)
  }
  const notasFirmar = notasSet.size

  // Agrupar
  const gruposMaterialAgua = agruparPorObra(
    viajesMaterialAgua,
    v => v.obra_cobro_id ?? v.obra_destino_id,
    v => (v.obra_cobro as { nombre: string } | null)?.nombre ?? (v.obras_destino as { nombre: string } | null)?.nombre ?? '-',
    residenteMap
  )
  const gruposDesmonte = agruparPorObra(
    viajesDesmonte,
    v => v.obra_origen_id,
    v => (v.obras_origen as { nombre: string } | null)?.nombre ?? '-',
    residenteMap
  )
  const gruposBasura = agruparPorObra(
    viajesBasura,
    v => v.obra_origen_id,
    v => (v.obras_origen as { nombre: string } | null)?.nombre ?? '-',
    residenteMap
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resumen del día</h1>
        <p className="text-sm text-gray-500 mt-1">{formatFecha(hoy.toISOString())}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center py-4">
          <div className="text-3xl font-bold text-gray-900">{totalViajes}</div>
          <div className="text-xs text-gray-500 mt-1">Viajes totales</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-3xl font-bold text-gray-900">{obrasActivas}</div>
          <div className="text-xs text-gray-500 mt-1">Obras activas</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-3xl font-bold text-gray-900">{m3Total.toFixed(1)}</div>
          <div className="text-xs text-gray-500 mt-1">m³ totales</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-3xl font-bold text-naranja-600">{notasFirmar}</div>
          <div className="text-xs text-gray-500 mt-1">Notas a firmar</div>
        </div>
      </div>

      {totalViajes === 0 && (
        <div className="card text-center py-12 text-gray-400">
          Sin viajes registrados hoy
        </div>
      )}

      {/* Sección 1: Material y Agua */}
      {gruposMaterialAgua.length > 0 && (
        <SeccionObras
          titulo="Obras que reciben material y agua"
          badge="se cobra al destino"
          badgeColor="bg-green-100 text-green-700"
          grupos={gruposMaterialAgua}
        />
      )}

      {/* Sección 2: Desmonte */}
      {gruposDesmonte.length > 0 && (
        <SeccionObras
          titulo="Trinchera — Desmonte"
          badge="se cobra al origen"
          badgeColor="bg-orange-100 text-orange-700"
          grupos={gruposDesmonte}
        />
      )}

      {/* Sección 3: Basura */}
      {gruposBasura.length > 0 && (
        <SeccionObras
          titulo="Basurero municipal — Retiro de basura"
          badge="se cobra al origen"
          badgeColor="bg-red-100 text-red-700"
          grupos={gruposBasura}
        />
      )}
    </div>
  )
}

function SeccionObras({
  titulo, badge, badgeColor, grupos
}: {
  titulo: string
  badge: string
  badgeColor: string
  grupos: GrupoObra[]
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-base font-bold text-gray-900">{titulo}</h2>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
      </div>

      {grupos.map(grupo => (
        <div key={grupo.obraId ?? grupo.obraNombre} className="card space-y-3">
          {/* Cabecera obra */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-gray-900">{grupo.obraNombre}</div>
              {grupo.residente !== '—' && (
                <div className="text-xs text-gray-500 mt-0.5">Residente: {grupo.residente}</div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold text-gray-900">{grupo.m3Total.toFixed(1)} m³</div>
              <div className="text-xs text-gray-500">{grupo.viajesCount} viaje{grupo.viajesCount !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Por contratista */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            {Object.values(grupo.contratistas).map(cont => (
              <div key={cont.nombre} className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700 min-w-0 flex-shrink">{cont.nombre}</span>
                <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                  {Object.entries(cont.materiales).map(([mat, info]) => (
                    <span
                      key={mat}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${CHIP_MATERIAL[mat] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {LABEL_MATERIAL[mat] ?? mat} ×{info.count}
                    </span>
                  ))}
                  <span className="text-sm font-semibold text-gray-900">
                    {Object.values(cont.materiales).reduce((s, m) => s + m.m3, 0).toFixed(1)} m³
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
