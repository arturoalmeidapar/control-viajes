'use client'

import { Truck, Droplets } from 'lucide-react'
import type { Contratista, Unidad } from '@/lib/supabase/types'

interface Paso1Props {
  contratistas: Contratista[]
  unidades: Unidad[]
  contratistaId: string
  unidadId: string
  onContratista: (id: string) => void
  onUnidad: (id: string) => void
  onSiguiente: () => void
}

export function Paso1({ contratistas, unidades, contratistaId, unidadId, onContratista, onUnidad, onSiguiente }: Paso1Props) {
  const unidadesFiltradas = unidades.filter(u => u.contratista_id === contratistaId && u.activo)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Paso 1 de 3</h2>
        <p className="text-gray-500 text-sm mt-1">Selecciona contratista y unidad</p>
      </div>

      {/* Contratista */}
      <div>
        <label className="label">Contratista</label>
        <select
          className="input"
          value={contratistaId}
          onChange={e => { onContratista(e.target.value); onUnidad('') }}
        >
          <option value="">-- Seleccionar --</option>
          {contratistas.filter(c => c.activo).map(c => (
            <option key={c.id} value={c.id}>{c.nombre} ({c.codigo})</option>
          ))}
        </select>
      </div>

      {/* Unidades */}
      {contratistaId && (
        <div>
          <label className="label">Unidad</label>
          {unidadesFiltradas.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Este contratista no tiene unidades activas</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {unidadesFiltradas.map(u => (
                <button
                  key={u.id}
                  onClick={() => onUnidad(u.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    unidadId === u.id
                      ? 'border-naranja-500 bg-naranja-50 text-naranja-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {u.tipo === 'pipa'
                    ? <Droplets className="w-7 h-7" />
                    : <Truck className="w-7 h-7" />
                  }
                  <span className="text-sm font-medium text-center leading-tight">{u.identificador}</span>
                  {u.capacidad_m3 && (
                    <span className="text-xs text-gray-500">{u.capacidad_m3}m³</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        className="btn-primary"
        disabled={!contratistaId || !unidadId}
        onClick={onSiguiente}
      >
        Siguiente
      </button>
    </div>
  )
}
