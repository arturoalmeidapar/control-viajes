'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ViajeCard } from '@/components/residente/ViajeCard'
import { suscribirNotificaciones } from '@/lib/push-client'
import { Bell, Calendar, RefreshCw } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import type { Viaje } from '@/lib/supabase/types'
import { isoFecha } from '@/lib/utils'

export default function ResidentePage() {
  const hoyIso = isoFecha(new Date())
  const [viajes, setViajes] = useState<Viaje[]>([])
  const [loading, setLoading] = useState(true)
  const [notifOk, setNotifOk] = useState(false)
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
      .eq('estado', 'pendiente')
      .gte('created_at', inicioRango)
      .lte('created_at', finRango)
      .order('created_at', { ascending: false })

    setViajes((data ?? []) as Viaje[])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar(fechaInicio, fechaFin)
    const supabase = createClient()
    const channel = supabase
      .channel('residente-viajes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viajes' }, () => cargar(fechaInicio, fechaFin))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [cargar, fechaInicio, fechaFin])

  async function handleSuscribirNotificaciones() {
    const ok = await suscribirNotificaciones()
    setNotifOk(ok)
  }

  const esHoy = fechaInicio === hoyIso && fechaFin === hoyIso

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pendientes</h1>
        <button onClick={() => cargar(fechaInicio, fechaFin)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

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

      {!notifOk && (
        <button
          onClick={handleSuscribirNotificaciones}
          className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-medium"
        >
          <Bell className="w-5 h-5 flex-shrink-0" />
          Activar notificaciones para recibir alertas de nuevos viajes
        </button>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : viajes.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-lg font-medium">Sin viajes pendientes</p>
          {esHoy
            ? <p className="text-sm mt-1">Se te notificará cuando llegue un nuevo viaje</p>
            : <p className="text-sm mt-1">No hay viajes pendientes en el rango seleccionado</p>
          }
        </div>
      ) : (
        <div className="space-y-4">
          {viajes.map(v => <ViajeCard key={v.id} viaje={v} onActualizado={() => cargar(fechaInicio, fechaFin)} />)}
        </div>
      )}
    </div>
  )
}
