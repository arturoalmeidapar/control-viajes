'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ViajeCard } from '@/components/residente/ViajeCard'
import { Calendar } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import type { Viaje } from '@/lib/supabase/types'
import { isoFecha } from '@/lib/utils'

export default function ConfirmadosPage() {
  const hoyIso = isoFecha(new Date())
  const [viajes, setViajes] = useState<Viaje[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaInicio, setFechaInicio] = useState(hoyIso)
  const [fechaFin, setFechaFin] = useState(hoyIso)

  const cargar = useCallback(async (inicio: string, fin: string) => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: asignaciones } = await supabase
      .from('residentes_obras')
      .select('obra_id')
      .eq('usuario_id', user.id)

    const obraIds = (asignaciones ?? []).map((a: { obra_id: string }) => a.obra_id)
    if (!obraIds.length) { setLoading(false); return }

    const inicioRango = new Date(inicio + 'T00:00:00').toISOString()
    const finRango = new Date(fin + 'T23:59:59.999').toISOString()

    const idList = obraIds.join(',')
    const { data } = await supabase
      .from('viajes')
      .select('*, contratistas(nombre,codigo), unidades(identificador,tipo), obras_origen:obras!viajes_obra_origen_id_fkey(nombre), obras_destino:obras!viajes_obra_destino_id_fkey(nombre,es_campo_golf)')
      .or(`obra_cobro_id.in.(${idList}),and(obra_cobro_id.is.null,obra_destino_id.in.(${idList}))`)
      .in('estado', ['confirmado', 'rechazado'])
      .gte('created_at', inicioRango)
      .lte('created_at', finRango)
      .order('residente_timestamp', { ascending: false })

    setViajes((data ?? []) as Viaje[])
    setLoading(false)
  }, [])

  useEffect(() => { cargar(fechaInicio, fechaFin) }, [cargar, fechaInicio, fechaFin])

  const esHoy = fechaInicio === hoyIso && fechaFin === hoyIso

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Confirmados y Rechazados</h1>

      {/* Selector de rango de fechas */}
      <div className="card space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Rango de fechas</span>
          {!esHoy && (
            <button
              onClick={() => { setFechaInicio(hoyIso); setFechaFin(hoyIso) }}
              className="ml-auto text-xs px-3 py-1 bg-naranja-500 text-white rounded-lg font-medium hover:bg-naranja-600 transition-colors"
            >
              Hoy
            </button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            className="input flex-1 text-sm"
            value={fechaInicio}
            max={fechaFin}
            onChange={e => setFechaInicio(e.target.value)}
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            className="input flex-1 text-sm"
            value={fechaFin}
            min={fechaInicio}
            onChange={e => setFechaFin(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : viajes.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          Sin viajes confirmados{esHoy ? ' hoy' : ' en el rango seleccionado'}
        </div>
      ) : (
        <div className="space-y-4">
          {viajes.map(v => <ViajeCard key={v.id} viaje={v} onActualizado={() => cargar(fechaInicio, fechaFin)} />)}
        </div>
      )}
    </div>
  )
}
