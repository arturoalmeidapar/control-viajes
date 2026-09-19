'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { inicioSemanaMX, inicioMesMX, inicioHoyMX, finHoyMX } from '@/lib/utils'
import { ResumenPeriodo } from './ResumenPeriodo'
import { ResumenViajes, type ViajeResumen } from './ResumenViajes'

type Tab = 'hoy' | 'semana' | 'mes'

interface Checador {
  id: string
  nombre: string
}

export function DashboardAdmin({ viajes: inicial, checadores = [] }: { viajes: ViajeResumen[]; checadores?: Checador[] }) {
  const [viajes, setViajes] = useState<ViajeResumen[]>(inicial)
  const [tab, setTab] = useState<Tab>('hoy')
  const [visitados, setVisitados] = useState<Set<Tab>>(() => new Set<Tab>(['hoy']))
  const [checadorId, setCheadorId] = useState('')
  const inicioSemana = useMemo(() => inicioSemanaMX(), [])
  const inicioMes = useMemo(() => inicioMesMX(), [])

  function irA(t: Tab) {
    setTab(t)
    setVisitados(prev => (prev.has(t) ? prev : new Set(prev).add(t)))
  }

  useEffect(() => {
    const supabase = createClient()
    const inicioHoy = inicioHoyMX().toISOString()
    const finHoy = finHoyMX().toISOString()

    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viajes' }, async () => {
        const { data } = await supabase
          .from('viajes')
          .select('id, estado, m3, importe_calculado, tipo_material, created_at, checador_id, contratistas(nombre,codigo), unidades(tipo), obra_cobro:obras!viajes_obra_cobro_id_fkey(nombre)')
          .gte('created_at', inicioHoy)
          .lt('created_at', finHoy)
          .order('created_at', { ascending: false })
        setViajes((data ?? []) as unknown as ViajeResumen[])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const viajesHoyFiltrados = checadorId ? viajes.filter(v => v.checador_id === checadorId) : viajes

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
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

        {/* Filtro por checador */}
        {checadores.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">Checador</label>
            <select
              className="input text-sm py-1.5"
              value={checadorId}
              onChange={e => setCheadorId(e.target.value)}
            >
              <option value="">Todos</option>
              {checadores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: tab === 'hoy' ? 'block' : 'none' }}>
        <ResumenViajes viajes={viajesHoyFiltrados} titulo="Hoy" mostrarLista />
      </div>

      {visitados.has('semana') && (
        <div style={{ display: tab === 'semana' ? 'block' : 'none' }}>
          <ResumenPeriodo desde={inicioSemana} titulo="Esta semana" mostrarLista checadorId={checadorId} />
        </div>
      )}

      {visitados.has('mes') && (
        <div style={{ display: tab === 'mes' ? 'block' : 'none' }}>
          <ResumenPeriodo desde={inicioMes} titulo="Este mes" checadorId={checadorId} />
        </div>
      )}
    </div>
  )
}
