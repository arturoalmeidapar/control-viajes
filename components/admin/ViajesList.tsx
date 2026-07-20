'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BadgeEstado } from '@/components/ui/Badge'
import { formatFechaHora, ETIQUETAS_MATERIAL, isoFecha } from '@/lib/utils'
import { formatMoneda } from '@/lib/calc-importe'
import { Download, Search, Filter, Trash2, Pencil, CheckCircle, XCircle, MoreHorizontal } from 'lucide-react'
import { EditarViajeModal } from './EditarViajeModal'
import type { Viaje, EstadoViaje, Obra, Contratista, Unidad, Distancia, Tarifa } from '@/lib/supabase/types'
import Image from 'next/image'

const ESTADOS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'rechazado', label: 'Rechazado' },
]

interface Toast {
  tipo: 'exito' | 'error'
  mensaje: string
}

interface Props {
  obras: Obra[]
  contratistas: Contratista[]
  unidades: Unidad[]
  distancias: Distancia[]
  tarifas: Tarifa[]
  adminId?: string
  esAdmin?: boolean
}

export function ViajesAdmin({ obras, contratistas, unidades, distancias, tarifas, adminId, esAdmin = false }: Props) {
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

  // Foto modal
  const [viajeDetalle, setViajeDetalle] = useState<Viaje | null>(null)

  // Eliminar
  const [viajeAEliminar, setViajeAEliminar] = useState<Viaje | null>(null)
  const [eliminando, setEliminando] = useState(false)

  // Editar
  const [viajeAEditar, setViajeAEditar] = useState<Viaje | null>(null)

  // Confirmar / Rechazar
  const [viajeARechazar, setViajeARechazar] = useState<Viaje | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [procesando, setProcesando] = useState(false)

  // Menú móvil
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null)
  useEffect(() => {
    if (!menuAbiertoId) return
    function cerrar() { setMenuAbiertoId(null) }
    document.addEventListener('click', cerrar)
    return () => document.removeEventListener('click', cerrar)
  }, [menuAbiertoId])

  // Toast
  const [toast, setToast] = useState<Toast | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const buscar = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let q = supabase
      .from('viajes')
      .select('*, contratistas(nombre,codigo), unidades(identificador,tipo), obras_origen:obras!viajes_obra_origen_id_fkey(nombre), obras_destino:obras!viajes_obra_destino_id_fkey(nombre), checador:usuarios!viajes_checador_id_fkey(nombre), residente:usuarios!viajes_residente_id_fkey(nombre)')
      .gte('created_at', `${fechaDesde}T00:00:00`)
      .lte('created_at', `${fechaHasta}T23:59:59`)
      .order('created_at', { ascending: false })

    if (obraId) q = q.eq('obra_cobro_id', obraId)
    if (contratistaId) q = q.eq('contratista_id', contratistaId)
    if (estado) q = q.eq('estado', estado)
    if (material) q = q.eq('tipo_material', material)

    const { data } = await q
    setViajes((data ?? []) as Viaje[])
    setLoading(false)
    setCargado(true)
  }, [fechaDesde, fechaHasta, obraId, contratistaId, estado, material])

  async function confirmarEliminar() {
    if (!viajeAEliminar) return
    setEliminando(true)
    const supabase = createClient()
    const { error, count } = await supabase
      .from('viajes')
      .delete({ count: 'exact' })
      .eq('id', viajeAEliminar.id)
    setEliminando(false)
    setViajeAEliminar(null)
    if (error || count === 0) {
      setToast({ tipo: 'error', mensaje: 'No se pudo eliminar el viaje. Verifica que el SQL de permisos esté aplicado en Supabase.' })
    } else {
      setViajes(prev => prev.filter(v => v.id !== viajeAEliminar.id))
      setToast({ tipo: 'exito', mensaje: 'Viaje eliminado correctamente.' })
    }
  }

  async function ejecutarConfirmar(viaje: Viaje) {
    setProcesando(true)
    const supabase = createClient()
    const { error, count } = await supabase
      .from('viajes')
      .update({
        estado: 'confirmado',
        residente_id: adminId ?? null,
        residente_timestamp: new Date().toISOString(),
        motivo_rechazo: null,
      }, { count: 'exact' })
      .eq('id', viaje.id)
    setProcesando(false)
    if (error || count === 0) {
      setToast({ tipo: 'error', mensaje: 'No se pudo confirmar el viaje. Verifica los permisos RLS en Supabase.' })
    } else {
      setViajes(prev => prev.map(v => v.id === viaje.id
        ? { ...v, estado: 'confirmado' as EstadoViaje, residente_id: adminId ?? null, motivo_rechazo: null }
        : v
      ))
      setToast({ tipo: 'exito', mensaje: 'Viaje confirmado.' })
    }
  }

  async function ejecutarRechazar() {
    if (!viajeARechazar || motivoRechazo.trim().length < 10) return
    setProcesando(true)
    const supabase = createClient()
    const motivo = motivoRechazo.trim()
    const id = viajeARechazar.id
    const { error, count } = await supabase
      .from('viajes')
      .update({
        estado: 'rechazado',
        residente_id: adminId ?? null,
        residente_timestamp: new Date().toISOString(),
        motivo_rechazo: motivo,
      }, { count: 'exact' })
      .eq('id', id)
    setProcesando(false)
    if (error || count === 0) {
      setToast({ tipo: 'error', mensaje: 'No se pudo rechazar el viaje. Verifica los permisos RLS en Supabase.' })
      return
    }
    setViajes(prev => prev.map(v => v.id === id
      ? { ...v, estado: 'rechazado' as EstadoViaje, residente_id: adminId ?? null, motivo_rechazo: motivo }
      : v
    ))
    setViajeARechazar(null)
    setMotivoRechazo('')
    setToast({ tipo: 'exito', mensaje: 'Viaje rechazado.' })
  }

  function handleViajeEditado(viajeActualizado: Viaje, cambios: string[]) {
    setViajes(prev => prev.map(v => v.id === viajeActualizado.id ? viajeActualizado : v))
    setViajeAEditar(null)
    const msg = cambios.length > 0
      ? `Viaje actualizado — ${cambios.join(', ')}`
      : 'Viaje guardado sin cambios.'
    setToast({ tipo: 'exito', mensaje: msg })
  }

  async function exportarExcel() {
    const XLSX = await import('xlsx')
    const filas = viajes.map(v => ({
      'Fecha/Hora': formatFechaHora(v.created_at),
      'Checador': (v.checador as { nombre?: string } | null)?.nombre ?? '',
      'Contratista': (v.contratistas as { nombre?: string } | null)?.nombre ?? '',
      'Unidad': (v.unidades as { identificador?: string } | null)?.identificador ?? '',
      'Origen': (v.obras_origen as { nombre?: string } | null)?.nombre ?? '',
      'Destino': v.tipo_material === 'desmonte' ? `${(v.obras_origen as { nombre?: string } | null)?.nombre ?? '-'} → Trinchera` :
                 v.tipo_material === 'basura' ? 'Basurero municipal' :
                 (v.obras_destino as { nombre?: string } | null)?.nombre ?? '',
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
            <label className="label text-xs">Obra cobro</label>
            <select className="input text-sm py-2" value={obraId} onChange={e => setObraId(e.target.value)}>
              <option value="">Todas</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Contratista</label>
            <select className="input text-sm py-2" value={contratistaId} onChange={e => setContratistaId(e.target.value)}>
              <option value="">Todos</option>
              {contratistas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
                {esAdmin && <th className="pb-3"></th>}
              </tr>
            </thead>
            <tbody>
              {viajes.map(v => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-500 whitespace-nowrap">{new Date(v.created_at).toLocaleString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
                  <td className="py-2">{(v.contratistas as { nombre?: string } | null)?.nombre}</td>
                  <td className="py-2 text-gray-600">{(v.unidades as { identificador?: string } | null)?.identificador}</td>
                  <td className="py-2 text-xs max-w-[140px] truncate" title={v.tipo_material === 'desmonte' ? `${(v.obras_origen as { nombre?: string } | null)?.nombre ?? '-'} → Trinchera` : undefined}>
                    {v.tipo_material === 'desmonte' ? `${(v.obras_origen as { nombre?: string } | null)?.nombre ?? '-'} → Trinchera` :
                     v.tipo_material === 'basura' ? 'Basurero municipal' :
                     (v.obras_destino as { nombre?: string } | null)?.nombre ?? '-'}
                  </td>
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
                  {esAdmin && (
                    <td className="py-2 text-center">
                      {/* Desktop: botones icono en cuadrícula */}
                      <div className="hidden md:grid grid-cols-2 gap-0.5 w-fit mx-auto">
                        {(v.estado === 'pendiente' || v.estado === 'rechazado') ? (
                          <button
                            onClick={() => ejecutarConfirmar(v)}
                            disabled={procesando}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                            title="Confirmar viaje"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : <span />}
                        {(v.estado === 'pendiente' || v.estado === 'confirmado') ? (
                          <button
                            onClick={() => { setViajeARechazar(v); setMotivoRechazo('') }}
                            disabled={procesando}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                            title="Rechazar viaje"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : <span />}
                        <button
                          onClick={() => setViajeAEditar(v)}
                          disabled={procesando}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
                          title="Editar viaje"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViajeAEliminar(v)}
                          disabled={procesando}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Eliminar viaje"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Móvil: menú tres puntos */}
                      <div className="md:hidden relative">
                        <button
                          onClick={e => { e.stopPropagation(); setMenuAbiertoId(menuAbiertoId === v.id ? null : v.id) }}
                          disabled={procesando}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {menuAbiertoId === v.id && (
                          <div
                            className="absolute right-0 top-8 z-30 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[150px]"
                            onClick={e => e.stopPropagation()}
                          >
                            {(v.estado === 'pendiente' || v.estado === 'rechazado') && (
                              <button
                                onClick={() => { ejecutarConfirmar(v); setMenuAbiertoId(null) }}
                                disabled={procesando}
                                className="w-full text-left px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2 disabled:opacity-40"
                              >
                                <CheckCircle className="w-4 h-4" /> Confirmar
                              </button>
                            )}
                            {(v.estado === 'pendiente' || v.estado === 'confirmado') && (
                              <button
                                onClick={() => { setViajeARechazar(v); setMotivoRechazo(''); setMenuAbiertoId(null) }}
                                disabled={procesando}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2 disabled:opacity-40"
                              >
                                <XCircle className="w-4 h-4" /> Rechazar
                              </button>
                            )}
                            <button
                              onClick={() => { setViajeAEditar(v); setMenuAbiertoId(null) }}
                              disabled={procesando}
                              className="w-full text-left px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-40"
                            >
                              <Pencil className="w-4 h-4" /> Editar
                            </button>
                            <button
                              onClick={() => { setViajeAEliminar(v); setMenuAbiertoId(null) }}
                              disabled={procesando}
                              className="w-full text-left px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2 disabled:opacity-40"
                            >
                              <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  )}
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

      {/* Modal editar viaje */}
      {viajeAEditar && (
        <EditarViajeModal
          viaje={viajeAEditar}
          contratistas={contratistas}
          unidades={unidades}
          obras={obras}
          distancias={distancias}
          tarifas={tarifas}
          onClose={() => setViajeAEditar(null)}
          onGuardado={handleViajeEditado}
        />
      )}

      {/* Modal rechazar viaje */}
      {viajeARechazar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => !procesando && (setViajeARechazar(null), setMotivoRechazo(''))}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 rounded-xl flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Rechazar viaje</h3>
                <p className="text-sm text-gray-500 mt-0.5">El motivo es obligatorio.</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700 space-y-0.5">
              <div className="font-medium">{(viajeARechazar.contratistas as { nombre?: string } | null)?.nombre ?? '-'}</div>
              <div className="text-gray-500">
                {viajeARechazar.m3}m³ {ETIQUETAS_MATERIAL[viajeARechazar.tipo_material]} — {new Date(viajeARechazar.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div>
              <label className="label">Motivo del rechazo <span className="text-red-500">*</span></label>
              <textarea
                className="input"
                rows={3}
                placeholder="Describe el motivo (mínimo 10 caracteres)..."
                value={motivoRechazo}
                onChange={e => setMotivoRechazo(e.target.value)}
                disabled={procesando}
                autoFocus
              />
              {motivoRechazo.length > 0 && motivoRechazo.trim().length < 10 && (
                <p className="text-xs text-red-500 mt-1">{motivoRechazo.trim().length}/10 caracteres mínimos</p>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button
                className="btn-secondary flex-1 py-2.5"
                onClick={() => { setViajeARechazar(null); setMotivoRechazo('') }}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                onClick={ejecutarRechazar}
                disabled={motivoRechazo.trim().length < 10 || procesando}
              >
                {procesando ? 'Rechazando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {viajeAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => !eliminando && setViajeAEliminar(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 rounded-xl flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">¿Eliminar este viaje?</h3>
                <p className="text-sm text-gray-500 mt-0.5">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700 space-y-0.5">
              <div className="font-medium">{(viajeAEliminar.contratistas as { nombre?: string } | null)?.nombre ?? '-'}</div>
              <div className="text-gray-500">
                {viajeAEliminar.m3}m³ {ETIQUETAS_MATERIAL[viajeAEliminar.tipo_material]} — {new Date(viajeAEliminar.created_at).toLocaleString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                className="btn-secondary flex-1 py-2.5"
                onClick={() => setViajeAEliminar(null)}
                disabled={eliminando}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                onClick={confirmarEliminar}
                disabled={eliminando}
              >
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notificación */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium transition-all max-w-sm text-center ${
          toast.tipo === 'exito'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.tipo === 'exito'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <XCircle className="w-4 h-4 flex-shrink-0" />
          }
          {toast.mensaje}
        </div>
      )}
    </div>
  )
}
