'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BadgeEstado } from '@/components/ui/Badge'
import { formatFechaHora, ETIQUETAS_MATERIAL, isoFecha } from '@/lib/utils'
import { formatMoneda } from '@/lib/calc-importe'
import { Download, Search, Filter } from 'lucide-react'
import type { Viaje, EstadoViaje } from '@/lib/supabase/types'
import Image from 'next/image'

const ESTADOS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'rechazado', label: 'Rechazado' },
]

interface Props {
  obrasOpciones: { id: string; nombre: string }[]
  contratistasOpciones: { id: string; nombre: string }[]
}

export function ViajesAdmin({ obrasOpciones, contratistasOpciones }: Props) {
  const [viajes, setViajes] = useState<Viaje[]>([])
  const [loading, setLoading] = useState(false)
  const [cargado, setCargado] = useState(false)

  // Filtros
  const [fechaDesde, setFechaDesde] = useState(isoFecha(new Date()))
  const [fechaHasta, setFechaHasta] = useState(isoFecha(new Date()))
  const [obraId, setObraId] = useState('')
  const [contratistaId, setContratistaId] = useState('')
  const [estado, setEstado] = useState('')
  const [material, setMaterial] = useState('')

  // Viaje seleccionado para foto
  const [viajeDetalle, setViajeDetalle] = useState<Viaje | null>(null)

  const buscar = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let q = supabase
      .from('viajes')
      .select('*, contratistas(nombre,codigo), unidades(identificador,tipo), obras_origen:obras!viajes_obra_origen_id_fkey(nombre), obras_destino:obras!viajes_obra_destino_id_fkey(nombre), checador:usuarios!viajes_checador_id_fkey(nombre), residente:usuarios!viajes_residente_id_fkey(nombre)')
      .gte('created_at', `${fechaDesde}T00:00:00`)
      .lte('created_at', `${fechaHasta}T23:59:59`)
      .order('created_at', { ascending: false })

    if (obraId) q = q.eq('obra_destino_id', obraId)
    if (contratistaId) q = q.eq('contratista_id', contratistaId)
    if (estado) q = q.eq('estado', estado)
    if (material) q = q.eq('tipo_material', material)

    const { data } = await q
    setViajes((data ?? []) as Viaje[])
    setLoading(false)
    setCargado(true)
  }, [fechaDesde, fechaHasta, obraId, contratistaId, estado, material])

  async function exportarExcel() {
    const XLSX = await import('xlsx')
    const filas = viajes.map(v => ({
      'Fecha/Hora': formatFechaHora(v.created_at),
      'Checador': (v.checador as { nombre?: string } | null)?.nombre ?? '',
      'Contratista': (v.contratistas as { nombre?: string } | null)?.nombre ?? '',
      'Unidad': (v.unidades as { identificador?: string } | null)?.identificador ?? '',
      'Origen': (v.obras_origen as { nombre?: string } | null)?.nombre ?? '',
      'Destino': (v.obras_destino as { nombre?: string } | null)?.nombre ?? '',
      'Zona': v.zona_destino ?? '',
      'Material': ETIQUETAS_MATERIAL[v.tipo_material],
      'm³': v.m3,
      'Distancia km': v.distancia_km,
      'Importe': v.importe_calculado,
      'Estado': v.estado,
      'Residente': (v.residente as { nombre?: string } | null)?.nombre ?? '',
      'Motivo rechazo': v.motivo_rechazo ?? '',
      'Notas': v.notas ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Viajes')
    XLSX.writeFile(wb, `viajes_${fechaDesde}_${fechaHasta}.xlsx`)
  }

  const totalM3 = viajes.filter(v => v.estado === 'confirmado').reduce((s, v) => s + v.m3, 0)
  const totalImporte = viajes.filter(v => v.estado === 'confirmado').reduce((s, v) => s + v.importe_calculado, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Viajes</h1>
        {cargado && (
          <button onClick={exportarExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4" /> Excel
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <Filter className="w-4 h-4" /> Filtros
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Desde</label>
            <input type="date" className="input text-sm py-2" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Hasta</label>
            <input type="date" className="input text-sm py-2" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Estado</label>
            <select className="input text-sm py-2" value={estado} onChange={e => setEstado(e.target.value)}>
              {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Obra destino</label>
            <select className="input text-sm py-2" value={obraId} onChange={e => setObraId(e.target.value)}>
              <option value="">Todas</option>
              {obrasOpciones.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Contratista</label>
            <select className="input text-sm py-2" value={contratistaId} onChange={e => setContratistaId(e.target.value)}>
              <option value="">Todos</option>
              {contratistasOpciones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Material</label>
            <select className="input text-sm py-2" value={material} onChange={e => setMaterial(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(ETIQUETAS_MATERIAL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary py-2 text-sm" onClick={buscar} disabled={loading}>
          <Search className="w-4 h-4" /> {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {/* Totales */}
      {cargado && (
        <div className="flex gap-4 text-sm">
          <span className="font-medium text-gray-700">{viajes.length} viajes encontrados</span>
          <span className="text-green-700">✓ {totalM3.toFixed(1)}m³ confirmados</span>
          <span className="text-naranja-600 font-bold">{formatMoneda(totalImporte)}</span>
        </div>
      )}

      {/* Tabla */}
      {cargado && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="text-left pb-3">Fecha</th>
                <th className="text-left pb-3">Contratista</th>
                <th className="text-left pb-3">Unidad</th>
                <th className="text-left pb-3">Destino</th>
                <th className="text-right pb-3">m³</th>
                <th className="text-left pb-3">Mat.</th>
                <th className="text-right pb-3">Importe</th>
                <th className="text-left pb-3">Estado</th>
                <th className="text-left pb-3">Notas</th>
                <th className="pb-3">Foto</th>
              </tr>
            </thead>
            <tbody>
              {viajes.map(v => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-500 whitespace-nowrap">{new Date(v.created_at).toLocaleString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
                  <td className="py-2">{(v.contratistas as { nombre?: string } | null)?.nombre}</td>
                  <td className="py-2 text-gray-600">{(v.unidades as { identificador?: string } | null)?.identificador}</td>
                  <td className="py-2 text-xs max-w-[100px] truncate">{(v.obras_destino as { nombre?: string } | null)?.nombre}</td>
                  <td className="py-2 text-right">{v.m3}</td>
                  <td className="py-2 text-gray-600">{ETIQUETAS_MATERIAL[v.tipo_material]}</td>
                  <td className="py-2 text-right font-medium">{formatMoneda(v.importe_calculado)}</td>
                  <td className="py-2"><BadgeEstado estado={v.estado as EstadoViaje} /></td>
                  <td className="py-2 text-xs text-gray-500 max-w-[120px] truncate" title={v.notas ?? ''}>{v.notas ?? ''}</td>
                  <td className="py-2 text-center">
                    {v.foto_url && (
                      <button onClick={() => setViajeDetalle(v)} className="text-blue-500 text-xs underline">Ver</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {viajes.length === 0 && <p className="text-center py-8 text-gray-400">Sin resultados</p>}
        </div>
      )}

      {/* Modal foto */}
      {viajeDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setViajeDetalle(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full mx-4 space-y-3" onClick={e => e.stopPropagation()}>
            <Image src={viajeDetalle.foto_url} alt="Foto" width={400} height={300} className="w-full rounded-xl" />
            {viajeDetalle.motivo_rechazo && (
              <div className="bg-red-50 rounded-xl px-3 py-2 text-sm text-red-700">
                <span className="font-semibold">Motivo rechazo:</span> {viajeDetalle.motivo_rechazo}
              </div>
            )}
            {viajeDetalle.gps_lat && (
              <a href={`https://maps.google.com/?q=${viajeDetalle.gps_lat},${viajeDetalle.gps_lng}`} target="_blank" rel="noopener noreferrer" className="block text-center text-blue-600 text-sm underline">
                Ver GPS en Google Maps
              </a>
            )}
            <button onClick={() => setViajeDetalle(null)} className="w-full text-center text-sm text-gray-400 py-1">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
