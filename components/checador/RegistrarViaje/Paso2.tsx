'use client'

import { useEffect } from 'react'
import type { Obra, Distancia, TipoMaterial, Unidad } from '@/lib/supabase/types'

const MATERIALES_CAMION: { id: TipoMaterial; label: string }[] = [
  { id: 'desmonte', label: 'Desmonte' },
  { id: 'material', label: 'Material' },
  { id: 'basura', label: 'Basura' },
]

interface Paso2Props {
  obras: Obra[]
  distancias: Distancia[]
  unidad: Unidad | undefined
  obraOrigenId: string
  obraDestinoId: string
  zonaDestino: string
  tipoMaterial: TipoMaterial | ''
  m3: number | ''
  distanciaKm: number | ''
  distanciaManual: boolean
  notas: string
  onObraOrigen: (id: string) => void
  onObraDestino: (id: string) => void
  onZonaDestino: (v: string) => void
  onTipoMaterial: (t: TipoMaterial | '') => void
  onM3: (v: number | '') => void
  onDistancia: (v: number | '', manual: boolean) => void
  onNotas: (v: string) => void
  onSiguiente: () => void
  onAtras: () => void
}

export function Paso2({
  obras, distancias, unidad,
  obraOrigenId, obraDestinoId, zonaDestino, tipoMaterial, m3, distanciaKm, distanciaManual, notas,
  onObraOrigen, onObraDestino, onZonaDestino, onTipoMaterial, onM3, onDistancia, onNotas,
  onSiguiente, onAtras,
}: Paso2Props) {
  const esPipa = unidad?.tipo === 'pipa'

  // Pipa: auto-set agua + Lago 2da Fase + distancia 0
  useEffect(() => {
    if (!esPipa) return
    onTipoMaterial('agua')
    onDistancia(0, false)
    const lago = obras.find(o => o.nombre === 'Lago 2da Fase' && o.activo)
    if (lago) onObraOrigen(lago.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esPipa])

  // Desmonte/basura: auto-set destino y limpiar distancia
  useEffect(() => {
    if (tipoMaterial === 'desmonte') {
      onObraDestino('')
      onZonaDestino('Trinchera')
      onDistancia('', true)
    } else if (tipoMaterial === 'basura') {
      onObraDestino('')
      onZonaDestino('Basurero municipal')
      onDistancia(0, false)
    } else if (tipoMaterial === 'material') {
      onObraDestino('')
      onZonaDestino('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoMaterial])

  // Material: auto-calcular distancia desde tabla
  useEffect(() => {
    if (tipoMaterial !== 'material' || !obraOrigenId || !obraDestinoId) return
    if (obraOrigenId === obraDestinoId) {
      onDistancia(0, false)
      return
    }
    const dist = distancias.find(
      d => d.obra_origen_id === obraOrigenId && d.obra_destino_id === obraDestinoId
    )
    if (dist) {
      onDistancia(dist.distancia_km, false)
    } else {
      onDistancia('', true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraOrigenId, obraDestinoId, tipoMaterial])

  const obraDestinoObj = obras.find(o => o.id === obraDestinoId)
  const esCampoGolf = obraDestinoObj?.es_campo_golf ?? false

  // Condición para mostrar m³
  const showM3 = esPipa
    ? !!obraDestinoId
    : tipoMaterial === 'material'
      ? !!obraDestinoId
      : !!(tipoMaterial && obraOrigenId)

  // Validación según tipo
  let valido = false
  if (esPipa) {
    valido = !!obraDestinoId && !!m3
  } else if (tipoMaterial === 'desmonte') {
    valido = !!obraOrigenId && !!m3 && distanciaKm !== ''
  } else if (tipoMaterial === 'basura') {
    valido = !!obraOrigenId && !!m3
  } else if (tipoMaterial === 'material') {
    valido = !!obraOrigenId && !!obraDestinoId && !!m3 && distanciaKm !== '' && (!esCampoGolf || !!zonaDestino)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Paso 2 de 3</h2>
        <p className="text-gray-500 text-sm mt-1">Ruta, material y cantidad</p>
      </div>

      {/* ── PIPA: solo destino ── */}
      {esPipa && (
        <>
          <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700">
            <span className="font-semibold">Pipa de agua</span> — Origen: <span className="font-semibold">Lago 2da Fase</span>
          </div>
          <div>
            <label className="label">Obra Destino</label>
            <select className="input" value={obraDestinoId} onChange={e => onObraDestino(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {obras.filter(o => o.activo).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
        </>
      )}

      {/* ── CAMIÓN ── */}
      {!esPipa && (
        <>
          <div>
            <label className="label">Obra Origen</label>
            <select
              className="input"
              value={obraOrigenId}
              onChange={e => { onObraOrigen(e.target.value); onTipoMaterial('') }}
            >
              <option value="">-- Seleccionar --</option>
              {obras.filter(o => o.activo).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>

          {obraOrigenId && (
            <div>
              <label className="label">Tipo de Material</label>
              <div className="grid grid-cols-3 gap-2">
                {MATERIALES_CAMION.map(mat => (
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

          {/* MATERIAL: destino + distancia */}
          {tipoMaterial === 'material' && (
            <>
              <div>
                <label className="label">Obra Destino</label>
                <select className="input" value={obraDestinoId} onChange={e => onObraDestino(e.target.value)}>
                  <option value="">-- Seleccionar --</option>
                  {obras.filter(o => o.activo).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>

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

              {obraDestinoId && (
                <div>
                  <label className="label">
                    Distancia (km)
                    {distanciaManual && <span className="ml-2 text-xs text-amber-600 font-normal">⚠ Ingreso manual</span>}
                    {!distanciaManual && distanciaKm !== '' && <span className="ml-2 text-xs text-green-600 font-normal">✓ Calculada</span>}
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
            </>
          )}

          {/* DESMONTE: destino auto + distancia manual */}
          {tipoMaterial === 'desmonte' && (
            <>
              <div className="bg-orange-50 rounded-xl px-4 py-3 text-sm text-orange-700">
                Destino automático: <span className="font-semibold">Trinchera</span> — se cobra al origen
              </div>
              <div>
                <label className="label">
                  Distancia (km)
                  <span className="ml-2 text-xs text-amber-600 font-normal">⚠ Ingreso manual</span>
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
            </>
          )}

          {/* BASURA: destino auto, sin distancia */}
          {tipoMaterial === 'basura' && (
            <div className="bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">
              Destino automático: <span className="font-semibold">Basurero municipal</span> — tarifa fija, se cobra al origen
            </div>
          )}
        </>
      )}

      {/* m³ */}
      {showM3 && (
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

      {/* Notas opcionales */}
      <div>
        <label className="label">Notas <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
        <textarea
          className="input"
          placeholder="Ej: Lote 1, Sección norte, Hoyo 7..."
          rows={2}
          value={notas}
          onChange={e => onNotas(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button className="btn-secondary flex-1" onClick={onAtras}>Atrás</button>
        <button className="btn-primary flex-1" disabled={!valido} onClick={onSiguiente}>Siguiente</button>
      </div>
    </div>
  )
}
