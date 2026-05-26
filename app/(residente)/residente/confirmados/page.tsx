'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ViajeCard } from '@/components/residente/ViajeCard'
import { Spinner } from '@/components/ui/Spinner'
import type { Viaje } from '@/lib/supabase/types'

export default function ConfirmadosPage() {
  const [viajes, setViajes] = useState<Viaje[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
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

    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

    const idList = obraIds.join(',')
    const { data } = await supabase
      .from('viajes')
      .select('*, contratistas(nombre,codigo), unidades(identificador,tipo), obras_origen:obras!viajes_obra_origen_id_fkey(nombre), obras_destino:obras!viajes_obra_destino_id_fkey(nombre,es_campo_golf)')
      .or(`obra_cobro_id.in.(${idList}),and(obra_cobro_id.is.null,obra_destino_id.in.(${idList}))`)
      .in('estado', ['confirmado', 'rechazado'])
      .gte('created_at', inicioHoy)
      .order('residente_timestamp', { ascending: false })

    setViajes((data ?? []) as Viaje[])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Hoy — Confirmados y Rechazados</h1>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : viajes.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">Sin viajes confirmados hoy</div>
      ) : (
        <div className="space-y-4">
          {viajes.map(v => <ViajeCard key={v.id} viaje={v} onActualizado={cargar} />)}
        </div>
      )}
    </div>
  )
}
