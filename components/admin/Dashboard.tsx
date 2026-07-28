'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { inicioSemanaMX, inicioMesMX } from '@/lib/utils'
import { ResumenPeriodo } from './ResumenPeriodo'
import { ResumenViajes, type ViajeResumen } from './ResumenViajes'

type Tab = 'hoy' | 'semana' | 'mes'

export function DashboardAdmin({ viajes: inicial }: { viajes: ViajeResumen[] }) {
  const [viajes, setViajes] = useState<ViajeResumen[]>(inicial)
  const [tab, setTab] = useState<Tab>('hoy')
  const [visitados, setVisitados] = useState<Set<Tab>>(() => new Set<Tab>(['hoy']))
  const inicioSemana = useMemo(() => inicioSemanaMX(), [])
  const inicioMes = useMemo(() => inicioMesMX(), [])

  function irA(t: Tab) {
    setTab(t)
    setVisitados(prev => (prev.has(t) ? prev : new Set(prev).add(t)))
  }

  useEffect(() => {
    const supabase = createClient()
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
    const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString()

    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viajes' }, async () => {
        const { data } = await supabase
          .from('viajes')
          .select('id, estado, m3, importe_calculado, tipo_material, created_at, contratistas(nombre,codigo), unidades(tipo), obra_cobro:obras!viajes_obra_cobro_id_fkey(nombre)')
          .gte('created_at', inicioHoy)
          .lte('created_at', finHoy)
          .order('created_at', { ascending: false })
        setViajes((data ?? []) as unknown as ViajeResumen[])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="space-y-6">
      {/* Selector de pestañas */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          ['hoy', 'Hoy'],
          ['semana', 'Esta semana'],
          ['mes', 'Este mes'],
        ] as [Tab, string][]).map(([valor, etiqueta]) => (
          <button
            key={valor}
            onClick={() => irA(valor)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === valor
                ? 'border-naranja-500 text-naranja-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <div style={{ display: tab === 'hoy' ? 'block' : 'none' }}>
        <ResumenViajes viajes={viajes} titulo="Hoy" mostrarLista />
      </div>

      {visitados.has('semana') && (
        <div style={{ display: tab === 'semana' ? 'block' : 'none' }}>
          <ResumenPeriodo desde={inicioSemana} titulo="Esta semana" mostrarLista />
        </div>
      )}

      {visitados.has('mes') && (
        <div style={{ display: tab === 'mes' ? 'block' : 'none' }}>
          <ResumenPeriodo desde={inicioMes} titulo="Este mes" />
        </div>
      )}
    </div>
  )
}
