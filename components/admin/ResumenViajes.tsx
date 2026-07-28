import { Truck, Package, DollarSign, Clock, XCircle, Layers, Droplet } from 'lucide-react'
import { formatMoneda } from '@/lib/calc-importe'
import { ETIQUETAS_MATERIAL } from '@/lib/utils'
import { TarjetaMetrica } from './TarjetaMetrica'

export interface ViajeResumen {
  id: string
  estado: string
  m3: number
  importe_calculado: number
  tipo_material: string
  created_at: string
  contratistas: { nombre: string; codigo: string } | null
  unidades: { tipo: string } | null
  obra_cobro: { nombre: string } | null
}

const MATERIALES: { clave: string; etiqueta: string; emoji: string }[] = [
  { clave: 'agua', etiqueta: 'Agua (pipas)', emoji: '💧' },
  { clave: 'material', etiqueta: 'Material', emoji: '🪨' },
  { clave: 'desmonte', etiqueta: 'Desmonte', emoji: '🏗️' },
  { clave: 'basura', etiqueta: 'Basura', emoji: '🗑️' },
]

export function ResumenViajes({ viajes, titulo, mostrarLista }: { viajes: ViajeResumen[]; titulo: string; mostrarLista?: boolean }) {
  const pendientes = viajes.filter(v => v.estado === 'pendiente').length
  const confirmados = viajes.filter(v => v.estado === 'confirmado')
  const rechazados = viajes.filter(v => v.estado === 'rechazado').length
  const pipas = viajes.filter(v => v.unidades?.tipo === 'pipa').length
  const camiones = viajes.filter(v => v.unidades?.tipo === 'camion').length
  const m3Total = confirmados.reduce((s, v) => s + v.m3, 0)
  const importeTotal = confirmados.reduce((s, v) => s + v.importe_calculado, 0)

  // Desglose por material: viajes de todos los estados, m³ solo de confirmados
  const porMaterial: Record<string, { viajes: number; m3: number }> = {}
  for (const m of MATERIALES) porMaterial[m.clave] = { viajes: 0, m3: 0 }
  for (const v of viajes) {
    if (!porMaterial[v.tipo_material]) porMaterial[v.tipo_material] = { viajes: 0, m3: 0 }
    porMaterial[v.tipo_material].viajes++
  }
  for (const v of confirmados) {
    if (!porMaterial[v.tipo_material]) porMaterial[v.tipo_material] = { viajes: 0, m3: 0 }
    porMaterial[v.tipo_material].m3 += v.m3
  }

  // Agrupar confirmados por contratista (con desglose pipas/camiones)
  const porContratista: Record<string, { nombre: string; viajes: number; m3: number; importe: number; pipas: number; camiones: number }> = {}
  for (const v of confirmados) {
    const nombre = v.contratistas?.nombre ?? 'Sin nombre'
    if (!porContratista[nombre]) porContratista[nombre] = { nombre, viajes: 0, m3: 0, importe: 0, pipas: 0, camiones: 0 }
    porContratista[nombre].viajes++
    porContratista[nombre].m3 += v.m3
    porContratista[nombre].importe += v.importe_calculado
    if (v.unidades?.tipo === 'pipa') porContratista[nombre].pipas++
    else if (v.unidades?.tipo === 'camion') porContratista[nombre].camiones++
  }

  // Agrupar por obra cobro (destino para material/agua, origen para desmonte/basura)
  const porObra: Record<string, { nombre: string; viajes: number; m3: number; importe: number }> = {}
  for (const v of confirmados) {
    const nombre = v.obra_cobro?.nombre ?? 'Sin obra'
    if (!porObra[nombre]) porObra[nombre] = { nombre, viajes: 0, m3: 0, importe: 0 }
    porObra[nombre].viajes++
    porObra[nombre].m3 += v.m3
    porObra[nombre].importe += v.importe_calculado
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard — {titulo}</h1>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <TarjetaMetrica icono={<Layers />} color="blue" label="Total viajes" valor={String(viajes.length)} />
        <TarjetaMetrica icono={<Droplet />} color="cyan" label="Pipas" valor={String(pipas)} />
        <TarjetaMetrica icono={<Truck />} color="purple" label="Camiones" valor={String(camiones)} />
        <TarjetaMetrica icono={<Clock />} color="yellow" label="Pendientes" valor={String(pendientes)} />
        <TarjetaMetrica icono={<XCircle />} color="red" label="Rechazados" valor={String(rechazados)} />
        <TarjetaMetrica icono={<Package />} color="green" label="m³ confirmados" valor={`${m3Total.toFixed(1)}`} />
        <TarjetaMetrica icono={<DollarSign />} color="naranja" label="Importe" valor={formatMoneda(importeTotal)} />
      </div>

      {/* Desglose por material */}
      <div className="flex flex-wrap gap-3">
        {MATERIALES.map(m => (
          <div key={m.clave} className="card flex items-center gap-2 py-2 px-3">
            <span className="text-lg">{m.emoji}</span>
            <div>
              <div className="text-xs text-gray-500">{m.etiqueta}</div>
              <div className="text-sm font-semibold text-gray-900">
                {porMaterial[m.clave].viajes} viaje{porMaterial[m.clave].viajes === 1 ? '' : 's'} · {porMaterial[m.clave].m3.toFixed(1)} m³
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rechazados aviso */}
      {rechazados > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
          {rechazados} viaje{rechazados > 1 ? 's' : ''} rechazado{rechazados > 1 ? 's' : ''}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Por contratista */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Por Contratista</h2>
          {Object.values(porContratista).length === 0 ? (
            <p className="text-sm text-gray-400">Sin viajes confirmados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="text-left pb-2">Contratista</th>
                  <th className="text-right pb-2">Viajes</th>
                  <th className="text-right pb-2">m³</th>
                  <th className="text-right pb-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(porContratista).sort((a, b) => b.importe - a.importe).map(c => (
                  <tr key={c.nombre} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-900 font-medium">
                      {c.nombre}
                      <div className="text-[11px] text-gray-400 font-normal mt-0.5">
                        {c.pipas > 0 && <span className="mr-2">💧 {c.pipas} pipa{c.pipas > 1 ? 's' : ''}</span>}
                        {c.camiones > 0 && <span>🚛 {c.camiones} camión{c.camiones > 1 ? 'es' : ''}</span>}
                      </div>
                    </td>
                    <td className="py-1.5 text-right text-gray-600">{c.viajes}</td>
                    <td className="py-1.5 text-right text-gray-600">{c.m3.toFixed(1)}</td>
                    <td className="py-1.5 text-right font-medium">{formatMoneda(c.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Por obra (cobro) */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Por Obra (cobro)</h2>
          {Object.values(porObra).length === 0 ? (
            <p className="text-sm text-gray-400">Sin viajes confirmados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="text-left pb-2">Obra</th>
                  <th className="text-right pb-2">Viajes</th>
                  <th className="text-right pb-2">m³</th>
                  <th className="text-right pb-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(porObra).sort((a, b) => b.importe - a.importe).map(o => (
                  <tr key={o.nombre} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-900 text-xs">{o.nombre}</td>
                    <td className="py-1.5 text-right text-gray-600">{o.viajes}</td>
                    <td className="py-1.5 text-right text-gray-600">{o.m3.toFixed(1)}</td>
                    <td className="py-1.5 text-right font-medium text-xs">{formatMoneda(o.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Lista viajes recientes */}
      {mostrarLista && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Últimos viajes ({viajes.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b text-xs uppercase">
                  <th className="text-left pb-2">Fecha</th>
                  <th className="text-left pb-2">Contratista</th>
                  <th className="text-left pb-2">Obra cobro</th>
                  <th className="text-right pb-2">m³</th>
                  <th className="text-left pb-2">Material</th>
                  <th className="text-right pb-2">Importe</th>
                  <th className="text-left pb-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {viajes.slice(0, 20).map(v => (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 text-gray-500">{new Date(v.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-1.5 text-gray-900">{v.contratistas?.nombre}</td>
                    <td className="py-1.5 text-gray-600 text-xs max-w-[120px] truncate">{v.obra_cobro?.nombre ?? '-'}</td>
                    <td className="py-1.5 text-right">{v.m3}</td>
                    <td className="py-1.5 text-gray-600">{ETIQUETAS_MATERIAL[v.tipo_material]}</td>
                    <td className="py-1.5 text-right font-medium">{formatMoneda(v.importe_calculado)}</td>
                    <td className="py-1.5">
                      <span className={`badge-${v.estado}` as string}>{v.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
