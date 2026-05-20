'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle, XCircle, MapPin, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Viaje } from '@/lib/supabase/types'
import { formatHora, ETIQUETAS_MATERIAL } from '@/lib/utils'
import { formatMoneda } from '@/lib/calc-importe'

interface ViajeCardProps {
  viaje: Viaje
  onActualizado: () => void
}

export function ViajeCard({ viaje, onActualizado }: ViajeCardProps) {
  const [loading, setLoading] = useState(false)
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')

  const contratista = (viaje.contratistas as { nombre: string } | null)?.nombre ?? '-'
  const unidad = (viaje.unidades as { identificador: string } | null)?.identificador ?? '-'
  const origen = (viaje.obras_origen as { nombre: string } | null)?.nombre ?? '-'
  const destino = (viaje.obras_destino as { nombre: string } | null)?.nombre ?? '-'

  async function confirmar() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('viajes').update({
      estado: 'confirmado',
      residente_id: (await supabase.auth.getUser()).data.user?.id ?? null,
      residente_timestamp: new Date().toISOString(),
    }).eq('id', viaje.id)
    setLoading(false)
    onActualizado()
  }

  async function rechazar() {
    if (!motivo.trim()) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('viajes').update({
      estado: 'rechazado',
      residente_id: (await supabase.auth.getUser()).data.user?.id ?? null,
      residente_timestamp: new Date().toISOString(),
      motivo_rechazo: motivo.trim(),
    }).eq('id', viaje.id)
    setLoading(false)
    setRechazando(false)
    onActualizado()
  }

  return (
    <div className="card space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-gray-900">{contratista}</div>
          <div className="text-sm text-gray-500">{unidad}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-500 flex items-center gap-1 justify-end">
            <Clock className="w-3.5 h-3.5" />
            {formatHora(viaje.created_at)}
          </div>
        </div>
      </div>

      {/* Ruta */}
      <div className="bg-gray-50 rounded-xl px-3 py-2 text-sm">
        <span className="text-gray-500">{origen}</span>
        <span className="mx-2 text-gray-400">→</span>
        <span className="font-medium text-gray-900">{destino}</span>
        {viaje.zona_destino && <span className="text-gray-500 ml-1">({viaje.zona_destino})</span>}
      </div>

      {/* Datos */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium">{viaje.m3}m³</span>
        <span className="text-gray-500">{ETIQUETAS_MATERIAL[viaje.tipo_material]}</span>
        <span className="text-gray-500">{viaje.distancia_km}km</span>
        <span className="font-semibold text-naranja-600 ml-auto">{formatMoneda(viaje.importe_calculado)}</span>
      </div>

      {/* GPS */}
      {viaje.gps_lat && (
        <a
          href={`https://maps.google.com/?q=${viaje.gps_lat},${viaje.gps_lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-blue-600"
        >
          <MapPin className="w-3.5 h-3.5" />
          Ver en mapa
        </a>
      )}

      {/* Foto */}
      {viaje.foto_url && (
        <a href={viaje.foto_url} target="_blank" rel="noopener noreferrer">
          <Image
            src={viaje.foto_url}
            alt="Foto del viaje"
            width={400}
            height={200}
            className="w-full h-40 object-cover rounded-xl"
          />
        </a>
      )}

      {/* Acciones */}
      {viaje.estado === 'pendiente' && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          {rechazando ? (
            <div className="space-y-2">
              <textarea
                className="input text-sm"
                placeholder="Motivo del rechazo..."
                rows={2}
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 py-2 text-sm" onClick={() => setRechazando(false)}>
                  Cancelar
                </button>
                <button className="btn-danger flex-1 py-2 text-sm" onClick={rechazar} disabled={!motivo.trim() || loading}>
                  {loading ? 'Guardando...' : 'Rechazar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors"
                onClick={() => setRechazando(true)}
                disabled={loading}
              >
                <XCircle className="w-4 h-4" /> Rechazar
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors"
                onClick={confirmar}
                disabled={loading}
              >
                <CheckCircle className="w-4 h-4" /> Confirmar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Estado final */}
      {viaje.estado === 'confirmado' && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
          <CheckCircle className="w-4 h-4" />
          <span>Confirmado — {viaje.residente_timestamp ? formatHora(viaje.residente_timestamp) : ''}</span>
        </div>
      )}
      {viaje.estado === 'rechazado' && (
        <div className="flex flex-col gap-1 text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <span>Rechazado</span>
          </div>
          {viaje.motivo_rechazo && <span className="text-red-600">{viaje.motivo_rechazo}</span>}
        </div>
      )}
    </div>
  )
}
