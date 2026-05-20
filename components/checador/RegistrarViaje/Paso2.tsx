'use client'

import { useEffect } from 'react'
import type { Obra, Distancia, Tarifa, TipoMaterial, Contratista, Unidad } from '@/lib/supabase/types'
import { calcularImporte, formatMoneda } from '@/lib/calc-importe'

const MATERIALES: { id: TipoMaterial; label: string; soloTipo?: 'pipa' | 'camion' }[] = [
  { id: 'desmonte', label: 'Desmonte', soloTipo: 'camion' },
  { id: 'material', label: 'Material', soloTipo: 'camion' },
  { id: 'agua', label: 'Agua', soloTipo: 'pipa' },
  { id: 'basura', label: 'Basura', soloTipo: 'camion' },
]

interface Paso2Props {
  obras: Obra[]
  distancias: Distancia[]
  tarifas: Tarifa[]
  contratista: Contratista | undefined
  unidad: Unidad | undefined
  obraOrigenId: string
  obraDestinoId: string
  zonaDestino: string
  tipoMaterial: TipoMaterial | ''
  m3: number | ''
  distanciaKm: number | ''
  distanciaManual: boolean
  onObraOrigen: (id: string) => void
  onObraDestino: (id: string) => void
  onZonaDestino: (v: string) => void
  onTipoMaterial: (t: TipoMaterial) => void
  onM3: (v: number | '') => void
  onDistancia: (v: number | '', manual: boolean) => void
  onSiguiente: () => void
  onAtras: () => void
}

export function Paso2({
  obras, distancias, tarifas, contratista, unidad,
  obraOrigenId, obraDestinoId, zonaDestino, tipoMaterial, m3, distanciaKm, distanciaManual,
  onObraOrigen, onObraDestino, onZonaDestino, onTipoMaterial, onM3, onDistancia,
  onSiguiente, onAtras,
}: Paso2Props) {

  useEffect(() => {
    if (!obraOrigenId || !obraDestinoId) return
    const dist = distancias.find(
      d => d.obra_origen_id === obraOrigenId && d.obra_destino_id === obraDestinoId
    )
    if (dist) {
      onDistancia(dist.distancia_km, false)
    } else {
      onDistancia('', true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraOrigenId, obraDestinoId])

  const obraDestino = obras.find(o => o.id === obraDestinoId)
  const esCampoGolf = obraDestino?.es_campo_golf ?? false

  const materialesDisponibles = MATERIALES.filter(mat => {
    if (!unidad) return true
    if (mat.soloTipo && mat.soloTipo !== unidad.tipo) return false
    return true
  })

  const importe = tipoMaterial && m3 && distanciaKm && contratista
    ? calcularImporte(Number(m3), Number(distanciaKm), tipoMaterial, tarifas, contratista)
    : 0

  const valido = obraOrigenId && obraDestinoId && tipoMaterial && m3 && distanciaKm &&
    (!esCampoGolf || zonaDestino)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Paso 2 de 3</h2>
        <p className="text-gray-500 text-sm mt-1">Ruta, material y cantidad</p>
      </div>

      {/* Origen */}
      <div>
        <label className="label">Obra Origen</label>
        <select className="input" value={obraOrigenId} onChange={e => onObraOrigen(e.target.value)}>
          <option value="">-- Seleccionar --</option>
          {obras.filter(o => o.activo).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
      </div>

      {/* Destino */}
      <div>
        <label className="label">Obra Destino</label>
        <select className="input" value={obraDestinoId} onChange={e => onObraDestino(e.target.value)}>
          <option value="">-- Seleccionar --</option>
          {obras.filter(o => o.activo && o.id !== obraOrigenId).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
      </div>

      {/* Campo de golf: zona/hoyo */}
      {esCampoGolf && (
        <div>
          <label className="label">Zona / Hoyo <span className="text-red-500">*</span></label>
          <input
            className="input"
            placeholder="Ej: Hoyo 16"
            value={zonaDestino}
            onChange={e => onZonaDestino(e.target.value)}
          />
        </div>
      )}

      {/* Tipo de material */}
      {obraOrigenId && obraDestinoId && (
        <div>
          <label className="label">Tipo de Material</label>
          <div className="grid grid-cols-2 gap-2">
            {materialesDisponibles.map(mat => (
              <button
                key={mat.id}
                onClick={() => onTipoMaterial(mat.id)}
                className={`py-3 px-4 rounded-xl border-2 font-medium transition-all text-sm ${
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

      {/* m³ */}
      {tipoMaterial && (
        <div>
          <label className="label">Metros Cúbicos (m³)</label>
          <input
            type="number"
            className="input"
            placeholder="0.0"
            min="0.1"
            step="0.1"
            value={m3}
            onChange={e => onM3(e.target.value ? Number(e.target.value) : '')}
          />
        </div>
      )}

      {/* Distancia */}
      {obraOrigenId && obraDestinoId && (
        <div>
          <label className="label">
            Distancia (km)
            {distanciaManual && <span className="ml-2 text-xs text-amber-600 font-normal">⚠ Ingreso manual</span>}
            {!distanciaManual && <span className="ml-2 text-xs text-green-600 font-normal">✓ Calculada</span>}
          </label>
          <input
            type="number"
            className="input"
            placeholder="0"
            min="0"
            step="0.5"
            value={distanciaKm}
            onChange={e => onDistancia(e.target.value ? Number(e.target.value) : '', true)}
          />
        </div>
      )}

      {/* Importe estimado */}
      {importe > 0 && (
        <div className="bg-naranja-50 rounded-2xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-naranja-700">Importe estimado</span>
          <span className="text-2xl font-bold text-naranja-600">{formatMoneda(importe)}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button className="btn-secondary flex-1" onClick={onAtras}>Atrás</button>
        <button className="btn-primary flex-1" disabled={!valido} onClick={onSiguiente}>Siguiente</button>
      </div>
    </div>
  )
}
