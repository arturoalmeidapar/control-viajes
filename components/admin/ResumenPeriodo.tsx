'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Truck, Package, DollarSign, Clock, XCircle } from 'lucide-react'
import { formatMoneda } from '@/lib/calc-importe'
import { ETIQUETAS_MATERIAL } from '@/lib/utils'
import { TarjetaMetrica } from './TarjetaMetrica'

interface ViajePeriodo {
  id: string
  estado: string
  m3: number
  importe_calculado: number
  tipo_material: string
  created_at: string
  contratistas: { nombre: string; codigo: string } | null
  obra_cobro: { nombre: string } | null
}

export function ResumenPeriodo({ desde, titulo, mostrarLista }: { desde: Date; titulo: string; mostrarLista?: boolean }) {
  const [viajes, setViajes] = useState<ViajePeriodo[] | null>(null)

  useEffect(() => {
    let cancelado = false
    setViajes(null)

    async function cargar() {
      const supabase = createClient()
      const desdeIso = desde.toISOString()
      const resultado: ViajePeriodo[] = []
      const BATCH = 1000
      let from = 0
      while (true) {
        const { data } = await supabase
          .from('viajes')
          .select('id, estado, m3, importe_calculado, tipo_material, created_at, contratistas(nombre,codigo), obra_cobro:obras!viajes_obra_cobro_id_fkey(nombre)')
          .gte('created_at', desdeIso)
          .order('created_at', { ascending: false })
          .range(from, from + BATCH - 1)

        const batch = (data ?? []) as unknown as ViajePeriodo[]
        resultado.push(...batch)
        if (batch.length < BATCH) break
        from += BATCH
      }

      if (!cancelado) setViajes(resultado)
    }

    cargar()
    return () => { cancelado = true }
  }, [desde])

  if (viajes === null) {
    return <div className="card text-center py-10 text-gray-400">Calculando {titulo.toLowerCase()}...</div>
  }

  const pendientes = viajes.filter(v => v.estado === 'pendiente').length
  const confirmados = viajes.filter(v => v.estado === 'confirmado')
  const rechazados = viajes.filter(v => v.estado === 'rechazado').length
  const m3Total = confirmados.reduce((s, v) => s + v.m3, 0)
  const importeTotal = confirmados.reduce((s, v) => s + v.importe_calculado, 0)

  const porContratista: Record<string, { nombre: string; viajes: number; m3: number; importe: number }> = {}
  for (const v of confirmados) {
    const nombre = v.contratistas?.nombre ?? 'Sin nombre'
    if (!porContratista[nombre]) porContratista[nombre] = { nombre, viajes: 0, m3: 0, importe: 0 }
    porContratista[nombre].viajes++
    porContratista[nombre].m3 += v.m3
    porContratista[nombre].importe += v.importe_calculado
  }

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
      <h1 className="text-2xl font-bold text-gray-900">Dashboard — {titulo}</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <TarjetaMetrica icono={<Truck />} color="blue" label="Viajes" valor={String(viajes.length)} />
        <TarjetaMetrica icono={<Clock />} color="yellow" label="Pendientes" valor={String(pendientes)} />
        <TarjetaMetrica icono={<XCircle />} color="red" label="Rechazados" valor={String(rechazados)} />
        <TarjetaMetrica icono={<Package />} color="green" label="m³ confirmados" valor={`${m3Total.toFixed(1)}`} />
        <TarjetaMetrica icono={<DollarSign />} color="naranja" label="Importe" valor={formatMoneda(importeTotal)} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
                {Object.values(porContratista).sort((a, b) => b.importe - a.importe).map(c => (
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
                {Object.values(porObra).sort((a, b) => b.importe - a.importe).map(o => (
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

      {mostrarLista && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Últimos viajes ({viajes.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b text-xs uppercase">
                  <th className="text-left pb-2">Fecha</th>
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
                    <td className="py-1.5 text-gray-500">{new Date(v.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
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
      )}
    </div>
  )
}
