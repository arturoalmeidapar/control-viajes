'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ViajeCard } from '@/components/residente/ViajeCard'
import { suscribirNotificaciones } from '@/lib/push-client'
import { Bell, RefreshCw } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import type { Viaje } from '@/lib/supabase/types'

export default function ResidentePage() {
  const [viajes, setViajes] = useState<Viaje[]>([])
  const [loading, setLoading] = useState(true)
  const [notifOk, setNotifOk] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Obtener obras asignadas al residente
    const { data: asignaciones } = await supabase
      .from('residentes_obras')
      .select('obra_id')
      .eq('usuario_id', user.id)

    const obraIds = (asignaciones ?? []).map((a: { obra_id: string }) => a.obra_id)
    if (!obraIds.length) { setLoading(false); return }

    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

    const { data } = await supabase
      .from('viajes')
      .select('*, contratistas(nombre,codigo), unidades(identificador,tipo), obras_origen:obras!viajes_obra_origen_id_fkey(nombre), obras_destino:obras!viajes_obra_destino_id_fkey(nombre,es_campo_golf)')
      .in('obra_destino_id', obraIds)
      .eq('estado', 'pendiente')
      .gte('created_at', inicioHoy)
      .order('created_at', { ascending: false })

    setViajes((data ?? []) as Viaje[])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
    // Suscribir a cambios en tiempo real
    const supabase = createClient()
    const channel = supabase
      .channel('residente-viajes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viajes' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [cargar])

  async function handleSuscribirNotificaciones() {
    const ok = await suscribirNotificaciones()
    setNotifOk(ok)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pendientes</h1>
        <button onClick={cargar} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Notificaciones push */}
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
          <p className="text-sm mt-1">Se te notificará cuando llegue un nuevo viaje</p>
        </div>
      ) : (
        <div className="space-y-4">
          {viajes.map(v => <ViajeCard key={v.id} viaje={v} onActualizado={cargar} />)}
        </div>
      )}
    </div>
  )
}
