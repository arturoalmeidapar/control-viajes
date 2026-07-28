'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Truck, Package, DollarSign, Clock } from 'lucide-react'
import { formatMoneda } from '@/lib/calc-importe'
import { ETIQUETAS_MATERIAL, inicioSemanaMX, inicioMesMX } from '@/lib/utils'
import { TarjetaMetrica } from './TarjetaMetrica'
import { ResumenPeriodo } from './ResumenPeriodo'

type Tab = 'hoy' | 'semana' | 'mes'

interface ViajeResumen {
  id: string
  estado: string
  m3: number
  importe_calculado: number
  tipo_material: string
  created_at: string
  contratistas: { nombre: string; codigo: string } | null
  obra_cobro: { nombre: string } | null
}

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
          .select('id, estado, m3, importe_calculado, tipo_material, created_at, contratistas(nombre,codigo), obra_cobro:obras!viajes_obra_cobro_id_fkey(nombre)')
          .gte('created_at', inicioHoy)
          .lte('created_at', finHoy)
          .order('created_at', { ascending: false })
        setViajes((data ?? []) as unknown as ViajeResumen[])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const pendientes = viajes.filter(v => v.estado === 'pendiente').length
  const confirmados = viajes.filter(v => v.estado === 'confirmado')
  const rechazados = viajes.filter(v => v.estado === 'rechazado').length
  const m3Total = confirmados.reduce((s, v) => s + v.m3, 0)
  const importeTotal = confirmados.reduce((s, v) => s + v.importe_calculado, 0)

  // Agrupar confirmados por contratista
  const porContratista: Record<string, { nombre: string; viajes: number; m3: number; importe: number }> = {}
  for (const v of confirmados) {
    const nombre = v.contratistas?.nombre ?? 'Sin nombre'
    if (!porContratista[nombre]) porContratista[nombre] = { nombre, viajes: 0, m3: 0, importe: 0 }
    porContratista[nombre].viajes++
    porContratista[nombre].m3 += v.m3
    porContratista[nombre].importe += v.importe_calculado
  }

  // Agrupar por obra cobro (destino para material/agua, origen para desmonte/basura)
  const porObra: Record<string, { nombre: string; viajes: number; m3: number; importe: number }> = {}
  for (const v of confirmados) {
    const nombre = v.obra_cobro?.nombre ?? 'Sin obra'
    if (!porObra[nombre]) porObra[nombre] = { nombre, viajes: 0, m3: 0, importe: 0 }
    porObra[nombre].viajes++
    porObra[nombre].m3 += v.m3
    porObra[nombre].importe += v.importe_calculado
  }

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
        <PanelHoy viajes={viajes} pendientes={pendientes} rechazados={rechazados} m3Total={m3Total} importeTotal={importeTotal} porContratista={porContratista} porObra={porObra} />
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

function PanelHoy({ viajes, pendientes, rechazados, m3Total, importeTotal, porContratista, porObra }: {
  viajes: ViajeResumen[]
  pendientes: number
  rechazados: number
  m3Total: number
  importeTotal: number
  porContratista: Record<string, { nombre: string; viajes: number; m3: number; importe: number }>
  porObra: Record<string, { nombre: string; viajes: number; m3: number; importe: number }>
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard — Hoy</h1>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TarjetaMetrica icono={<Truck />} color="blue" label="Viajes hoy" valor={String(viajes.length)} />
        <TarjetaMetrica icono={<Clock />} color="yellow" label="Pendientes" valor={String(pendientes)} />
        <TarjetaMetrica icono={<Package />} color="green" label="m³ confirmados" valor={`${m3Total.toFixed(1)}`} />
        <TarjetaMetrica icono={<DollarSign />} color="naranja" label="Importe" valor={formatMoneda(importeTotal)} />
      </div>

      {/* Rechazados aviso */}
      {rechazados > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
          {rechazados} viaje{rechazados > 1 ? 's' : ''} rechazado{rechazados > 1 ? 's' : ''} hoy
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Por contratista */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Por Contratista</h2>
          {Object.values(porContratista).length === 0 ? (
            <p className="text-sm text-gray-400">Sin viajes confirmados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="text-left pb-2">Contratista</th>
                  <th className="text-right pb-2">Viajes</th>
                  <th className="text-right pb-2">m³</th>
                  <th className="text-right pb-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(porContratista).sort((a,b) => b.importe - a.importe).map(c => (
                  <tr key={c.nombre} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-900 font-medium">{c.nombre}</td>
                    <td className="py-1.5 text-right text-gray-600">{c.viajes}</td>
                    <td className="py-1.5 text-right text-gray-600">{c.m3.toFixed(1)}</td>
                    <td className="py-1.5 text-right font-medium">{formatMoneda(c.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Por obra (cobro) */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Por Obra (cobro)</h2>
          {Object.values(porObra).length === 0 ? (
            <p className="text-sm text-gray-400">Sin viajes confirmados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="text-left pb-2">Obra</th>
                  <th className="text-right pb-2">Viajes</th>
                  <th className="text-right pb-2">m³</th>
                  <th className="text-right pb-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(porObra).sort((a,b) => b.importe - a.importe).map(o => (
                  <tr key={o.nombre} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-900 text-xs">{o.nombre}</td>
                    <td className="py-1.5 text-right text-gray-600">{o.viajes}</td>
                    <td className="py-1.5 text-right text-gray-600">{o.m3.toFixed(1)}</td>
                    <td className="py-1.5 text-right font-medium text-xs">{formatMoneda(o.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Lista viajes recientes */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3">Últimos viajes ({viajes.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b text-xs uppercase">
                <th className="text-left pb-2">Hora</th>
                <th className="text-left pb-2">Contratista</th>
                <th className="text-left pb-2">Obra cobro</th>
                <th className="text-right pb-2">m³</th>
                <th className="text-left pb-2">Material</th>
                <th className="text-right pb-2">Importe</th>
                <th className="text-left pb-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {viajes.slice(0, 20).map(v => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-1.5 text-gray-500">{new Date(v.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="py-1.5 text-gray-900">{v.contratistas?.nombre}</td>
                  <td className="py-1.5 text-gray-600 text-xs max-w-[120px] truncate">{v.obra_cobro?.nombre ?? '-'}</td>
                  <td className="py-1.5 text-right">{v.m3}</td>
                  <td className="py-1.5 text-gray-600">{ETIQUETAS_MATERIAL[v.tipo_material]}</td>
                  <td className="py-1.5 text-right font-medium">{formatMoneda(v.importe_calculado)}</td>
                  <td className="py-1.5">
                    <span className={`badge-${v.estado}` as string}>{v.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
