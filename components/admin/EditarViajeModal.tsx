'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcularImporte, formatMoneda } from '@/lib/calc-importe'
import { X, Save } from 'lucide-react'
import type { Viaje, Contratista, Unidad, Obra, Distancia, Tarifa, TipoMaterial, EstadoViaje } from '@/lib/supabase/types'

const MATERIALES_CAMION: { id: TipoMaterial; label: string }[] = [
  { id: 'desmonte', label: 'Desmonte' },
  { id: 'material', label: 'Material' },
  { id: 'basura', label: 'Basura' },
]

const ESTADOS_VIAJE: { value: EstadoViaje; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'rechazado', label: 'Rechazado' },
]

interface Props {
  viaje: Viaje
  contratistas: Contratista[]
  unidades: Unidad[]
  obras: Obra[]
  distancias: Distancia[]
  tarifas: Tarifa[]
  onClose: () => void
  onGuardado: (viajeActualizado: Viaje, cambios: string[]) => void
}

export function EditarViajeModal({
  viaje, contratistas, unidades, obras, distancias, tarifas, onClose, onGuardado,
}: Props) {
  const [contratistaId, setContratistaId] = useState(viaje.contratista_id)
  const [unidadId, setUnidadId] = useState(viaje.unidad_id)
  const [obraOrigenId, setObraOrigenId] = useState(viaje.obra_origen_id)
  const [obraDestinoId, setObraDestinoId] = useState(viaje.obra_destino_id ?? '')
  const [zonaDestino, setZonaDestino] = useState(
    // Pre-cargar zona solo si es golf (no "Trinchera" ni "Basurero municipal")
    viaje.zona_destino && !['Trinchera', 'Basurero municipal'].includes(viaje.zona_destino)
      ? viaje.zona_destino
      : ''
  )
  const [tipoMaterial, setTipoMaterial] = useState<TipoMaterial>(viaje.tipo_material)
  const [m3, setM3] = useState<number | ''>(viaje.m3)
  const [distanciaKm, setDistanciaKm] = useState<number | ''>(viaje.distancia_km)
  const [estado, setEstado] = useState<EstadoViaje>(viaje.estado)
  const [notas, setNotas] = useState(viaje.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const unidad = unidades.find(u => u.id === unidadId)
  const esPipa = unidad?.tipo === 'pipa'

  const unidadesFiltradas = unidades.filter(u => u.contratista_id === contratistaId && u.activo)

  // Recalcular distancia automáticamente para material si hay tabla de distancias
  useEffect(() => {
    if (tipoMaterial !== 'material' || !obraOrigenId || !obraDestinoId) return
    if (obraOrigenId === obraDestinoId) { setDistanciaKm(0); return }
    const dist = distancias.find(
      d => d.obra_origen_id === obraOrigenId && d.obra_destino_id === obraDestinoId
    )
    if (dist) setDistanciaKm(dist.distancia_km)
  }, [obraOrigenId, obraDestinoId, tipoMaterial, distancias])

  const obraDestinoObj = obras.find(o => o.id === obraDestinoId)
  const esCampoGolf = obraDestinoObj?.es_campo_golf ?? false

  const contratista = contratistas.find(c => c.id === contratistaId)

  const obraCobroId = (tipoMaterial === 'desmonte' || tipoMaterial === 'basura')
    ? (obraOrigenId || null)
    : (obraDestinoId || null)

  const importeCalculado = tipoMaterial && m3 && contratista
    ? calcularImporte(Number(m3), Number(distanciaKm) || 0, tipoMaterial, tarifas, contratista)
    : 0

  // zona_destino real a guardar según el tipo de material
  const zonaDestinoFinal: string | null =
    tipoMaterial === 'desmonte' ? 'Trinchera' :
    tipoMaterial === 'basura' ? 'Basurero municipal' :
    tipoMaterial === 'material' && esCampoGolf ? (zonaDestino.trim() || null) :
    null

  let valido = false
  if (esPipa) {
    valido = !!contratistaId && !!unidadId && !!obraOrigenId && !!obraDestinoId && !!m3
  } else if (tipoMaterial === 'desmonte') {
    valido = !!contratistaId && !!unidadId && !!obraOrigenId && !!m3 && distanciaKm !== ''
  } else if (tipoMaterial === 'basura') {
    valido = !!contratistaId && !!unidadId && !!obraOrigenId && !!m3
  } else if (tipoMaterial === 'material') {
    valido = !!contratistaId && !!unidadId && !!obraOrigenId && !!obraDestinoId && !!m3 && distanciaKm !== '' && (!esCampoGolf || !!zonaDestino.trim())
  }

  function detectarCambios(): string[] {
    const c: string[] = []
    if (contratistaId !== viaje.contratista_id) c.push('Contratista')
    if (unidadId !== viaje.unidad_id) c.push('Unidad')
    if (obraOrigenId !== viaje.obra_origen_id) c.push('Origen')
    if ((obraDestinoId || null) !== viaje.obra_destino_id) c.push('Destino')
    if (tipoMaterial !== viaje.tipo_material) c.push('Material')
    if (Number(m3) !== viaje.m3) c.push('m³')
    if (Number(distanciaKm) !== viaje.distancia_km) c.push('Distancia km')
    if (estado !== viaje.estado) c.push('Estado')
    if ((notas.trim() || null) !== viaje.notas) c.push('Notas')
    return c
  }

  async function guardar() {
    if (!valido) return
    setGuardando(true)
    setError('')
    const supabase = createClient()

    const obraDestinoFinal = (tipoMaterial === 'desmonte' || tipoMaterial === 'basura') ? null : (obraDestinoId || null)

    const { error: err } = await supabase
      .from('viajes')
      .update({
        contratista_id: contratistaId,
        unidad_id: unidadId,
        obra_origen_id: obraOrigenId,
        obra_destino_id: obraDestinoFinal,
        obra_cobro_id: obraCobroId,
        zona_destino: zonaDestinoFinal,
        tipo_material: tipoMaterial,
        m3: Number(m3),
        distancia_km: Number(distanciaKm) || 0,
        importe_calculado: importeCalculado,
        estado,
        notas: notas.trim() || null,
      })
      .eq('id', viaje.id)

    setGuardando(false)

    if (err) {
      setError('No se pudo guardar el viaje. Intenta de nuevo.')
      return
    }

    // Construir viaje actualizado con los nuevos datos de joins
    const contratistaObj = contratistas.find(c => c.id === contratistaId)
    const unidadObj = unidades.find(u => u.id === unidadId)
    const obraOrigenObj = obras.find(o => o.id === obraOrigenId)
    const obraDestinoObj2 = obras.find(o => o.id === obraDestinoFinal)

    const viajeActualizado: Viaje = {
      ...viaje,
      contratista_id: contratistaId,
      unidad_id: unidadId,
      obra_origen_id: obraOrigenId,
      obra_destino_id: obraDestinoFinal,
      obra_cobro_id: obraCobroId,
      zona_destino: zonaDestinoFinal,
      tipo_material: tipoMaterial,
      m3: Number(m3),
      distancia_km: Number(distanciaKm) || 0,
      importe_calculado: importeCalculado,
      estado,
      notas: notas.trim() || null,
      contratistas: contratistaObj ? { id: contratistaObj.id, nombre: contratistaObj.nombre, codigo: contratistaObj.codigo } : viaje.contratistas,
      unidades: unidadObj ? { id: unidadObj.id, identificador: unidadObj.identificador, tipo: unidadObj.tipo } : viaje.unidades,
      obras_origen: obraOrigenObj ? { id: obraOrigenObj.id, nombre: obraOrigenObj.nombre } : viaje.obras_origen,
      obras_destino: obraDestinoObj2 ? { id: obraDestinoObj2.id, nombre: obraDestinoObj2.nombre, es_campo_golf: obraDestinoObj2.es_campo_golf } : undefined,
    }

    onGuardado(viajeActualizado, detectarCambios())
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => !guardando && onClose()}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h3 className="font-semibold text-gray-900">Editar viaje</h3>
          <button
            onClick={onClose}
            disabled={guardando}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Contratista */}
          <div>
            <label className="label">Contratista</label>
            <select
              className="input"
              value={contratistaId}
              onChange={e => { setContratistaId(e.target.value); setUnidadId('') }}
            >
              {contratistas.filter(c => c.activo).map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Unidad */}
          <div>
            <label className="label">Unidad</label>
            <select className="input" value={unidadId} onChange={e => setUnidadId(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {unidadesFiltradas.map(u => (
                <option key={u.id} value={u.id}>{u.identificador} ({u.tipo})</option>
              ))}
            </select>
          </div>

          {/* Tipo de material — solo camión */}
          {!esPipa && (
            <div>
              <label className="label">Tipo de material</label>
              <div className="grid grid-cols-3 gap-2">
                {MATERIALES_CAMION.map(mat => (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => setTipoMaterial(mat.id)}
                    className={`py-2.5 px-3 rounded-xl border-2 font-medium text-sm transition-all ${
                      tipoMaterial === mat.id
                        ? 'border-naranja-500 bg-naranja-50 text-naranja-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {mat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {esPipa && (
            <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700">
              <span className="font-semibold">Pipa de agua</span> — Tipo fijo: Agua
            </div>
          )}

          {/* Obra Origen */}
          {esPipa ? (
            <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700">
              Origen fijo: <span className="font-semibold">Lago 2da Fase</span>
            </div>
          ) : (
            <div>
              <label className="label">Obra Origen</label>
              <select className="input" value={obraOrigenId} onChange={e => setObraOrigenId(e.target.value)}>
                <option value="">-- Seleccionar --</option>
                {obras.filter(o => o.activo).map(o => (
                  <option key={o.id} value={o.id}>{o.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Obra Destino según tipo */}
          {tipoMaterial === 'desmonte' && (
            <div className="bg-orange-50 rounded-xl px-4 py-3 text-sm text-orange-700">
              Destino fijo: <span className="font-semibold">Trinchera</span> — se cobra al origen
            </div>
          )}
          {tipoMaterial === 'basura' && (
            <div className="bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">
              Destino fijo: <span className="font-semibold">Basurero municipal</span> — tarifa fija, se cobra al origen
            </div>
          )}
          {(tipoMaterial === 'material' || tipoMaterial === 'agua') && (
            <div>
              <label className="label">Obra Destino</label>
              <select className="input" value={obraDestinoId} onChange={e => setObraDestinoId(e.target.value)}>
                <option value="">-- Seleccionar --</option>
                {obras.filter(o => o.activo).map(o => (
                  <option key={o.id} value={o.id}>{o.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Zona golf */}
          {esCampoGolf && tipoMaterial === 'material' && (
            <div>
              <label className="label">Zona / Hoyo <span className="text-red-500">*</span></label>
              <input
                className="input"
                placeholder="Ej: Hoyo 16"
                value={zonaDestino}
                onChange={e => setZonaDestino(e.target.value)}
              />
            </div>
          )}

          {/* m³ */}
          <div>
            <label className="label">Metros cúbicos (m³)</label>
            <input
              type="number"
              className="input"
              placeholder="0.0"
              min="0.1"
              step="0.1"
              value={m3}
              onChange={e => setM3(e.target.value ? Number(e.target.value) : '')}
            />
          </div>

          {/* Distancia */}
          {(tipoMaterial === 'material' || tipoMaterial === 'desmonte') && (
            <div>
              <label className="label">Distancia (km)</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                min="0"
                step="0.5"
                value={distanciaKm}
                onChange={e => setDistanciaKm(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
          )}

          {/* Importe recalculado */}
          {!!m3 && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
              <span className="text-gray-500">Importe recalculado</span>
              <span className="font-bold text-naranja-600">{formatMoneda(importeCalculado)}</span>
            </div>
          )}

          {/* Estado */}
          <div>
            <label className="label">Estado</label>
            <select className="input" value={estado} onChange={e => setEstado(e.target.value as EstadoViaje)}>
              {ESTADOS_VIAJE.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="label">Notas <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
            <textarea
              className="input"
              placeholder="Notas adicionales..."
              rows={2}
              value={notas}
              onChange={e => setNotas(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
          <button
            className="btn-secondary flex-1 py-2.5"
            onClick={onClose}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            className="flex-1 py-2.5 rounded-xl bg-naranja-500 text-white font-semibold text-sm hover:bg-naranja-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            onClick={guardar}
            disabled={!valido || guardando}
          >
            <Save className="w-4 h-4" />
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
