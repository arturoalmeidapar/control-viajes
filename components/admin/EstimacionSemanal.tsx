'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download } from 'lucide-react'
import { formatMoneda } from '@/lib/calc-importe'
import { ETIQUETAS_MATERIAL, inicioFinSemana, isoFecha } from '@/lib/utils'
import type { Viaje } from '@/lib/supabase/types'

interface FilaResumen {
  contratista: string
  obra: string
  material: string
  viajes: number
  m3: number
  importe: number
}

export function EstimacionSemanal() {
  const hoy = new Date()
  const semanaActual = inicioFinSemana(hoy)
  const [fechaDesde, setFechaDesde] = useState(isoFecha(semanaActual.inicio))
  const [fechaHasta, setFechaHasta] = useState(isoFecha(semanaActual.fin))
  const [filas, setFilas] = useState<FilaResumen[]>([])
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)

  async function buscar() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('viajes')
      .select('m3, importe_calculado, tipo_material, contratistas(nombre), obras_destino:obras!viajes_obra_destino_id_fkey(nombre)')
      .eq('estado', 'confirmado')
      .gte('created_at', `${fechaDesde}T00:00:00`)
      .lte('created_at', `${fechaHasta}T23:59:59`)
      .order('created_at')

    const viajes = (data ?? []) as unknown as Viaje[]

    // Agrupar por contratista + obra + material
    const mapa: Record<string, FilaResumen> = {}
    for (const v of viajes) {
      const cont = (v.contratistas as { nombre?: string } | null)?.nombre ?? 'Sin nombre'
      const obra = (v.obras_destino as { nombre?: string } | null)?.nombre ?? 'Sin obra'
      const mat = ETIQUETAS_MATERIAL[v.tipo_material]
      const key = `${cont}||${obra}||${mat}`
      if (!mapa[key]) mapa[key] = { contratista: cont, obra, material: mat, viajes: 0, m3: 0, importe: 0 }
      mapa[key].viajes++
      mapa[key].m3 += v.m3
      mapa[key].importe += v.importe_calculado
    }

    setFilas(Object.values(mapa).sort((a, b) => a.contratista.localeCompare(b.contratista) || a.obra.localeCompare(b.obra)))
    setLoading(false)
    setBuscado(true)
  }

  async function exportarExcel() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    // Hoja de detalle por contratista
    const filaExcel = filas.map(f => ({
      'Contratista': f.contratista,
      'Obra': f.obra,
      'Material': f.material,
      '# Viajes': f.viajes,
      'm³': f.m3,
      'Importe': f.importe,
    }))

    // Agregar totales por contratista
    const contistasSeen = new Set<string>()
    const filasConTotales: object[] = []
    let totContratista = { viajes: 0, m3: 0, importe: 0 }
    let contActual = ''

    for (const f of filas) {
      if (f.contratista !== contActual) {
        if (contActual) {
          filasConTotales.push({ 'Contratista': `SUBTOTAL ${contActual}`, 'Obra': '', 'Material': '', '# Viajes': totContratista.viajes, 'm³': totContratista.m3, 'Importe': totContratista.importe })
          filasConTotales.push({})
        }
        contActual = f.contratista
        totContratista = { viajes: 0, m3: 0, importe: 0 }
      }
      filasConTotales.push({ 'Contratista': contistasSeen.has(f.contratista) ? '' : f.contratista, 'Obra': f.obra, 'Material': f.material, '# Viajes': f.viajes, 'm³': f.m3, 'Importe': f.importe })
      contistasSeen.add(f.contratista)
      totContratista.viajes += f.viajes
      totContratista.m3 += f.m3
      totContratista.importe += f.importe
    }
    if (contActual) {
      filasConTotales.push({ 'Contratista': `SUBTOTAL ${contActual}`, 'Obra': '', 'Material': '', '# Viajes': totContratista.viajes, 'm³': totContratista.m3, 'Importe': totContratista.importe })
    }

    const totalGeneral = filas.reduce((s, f) => ({ viajes: s.viajes + f.viajes, m3: s.m3 + f.m3, importe: s.importe + f.importe }), { viajes: 0, m3: 0, importe: 0 })
    filasConTotales.push({})
    filasConTotales.push({ 'Contratista': 'TOTAL GENERAL', 'Obra': '', 'Material': '', '# Viajes': totalGeneral.viajes, 'm³': totalGeneral.m3, 'Importe': totalGeneral.importe })

    const ws = XLSX.utils.json_to_sheet(filasConTotales)
    ws['!cols'] = [{ wch: 30 }, { wch: 35 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Estimación')

    void filaExcel // silencia advertencia de variable no usada
    XLSX.writeFile(wb, `estimacion_${fechaDesde}_${fechaHasta}.xlsx`)
  }

  const totalGeneral = filas.reduce((s, f) => ({ viajes: s.viajes + f.viajes, m3: s.m3 + f.m3, importe: s.importe + f.importe }), { viajes: 0, m3: 0, importe: 0 })

  // Agrupar por contratista para la tabla
  const porContratista: Record<string, FilaResumen[]> = {}
  for (const f of filas) {
    if (!porContratista[f.contratista]) porContratista[f.contratista] = []
    porContratista[f.contratista].push(f)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Estimación Semanal</h1>
        {buscado && (
          <button onClick={exportarExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
        )}
      </div>

      <div className="card">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Semana desde</label>
            <input type="date" className="input" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary mt-4 py-2 text-sm" onClick={buscar} disabled={loading}>
          {loading ? 'Calculando...' : 'Calcular Estimación'}
        </button>
      </div>

      {buscado && (
        <>
          {/* Resumen total */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <div className="text-2xl font-bold text-gray-900">{totalGeneral.viajes}</div>
              <div className="text-xs text-gray-500">Viajes confirmados</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-gray-900">{totalGeneral.m3.toFixed(1)}</div>
              <div className="text-xs text-gray-500">m³ totales</div>
            </div>
            <div className="card text-center">
              <div className="text-lg font-bold text-naranja-600">{formatMoneda(totalGeneral.importe)}</div>
              <div className="text-xs text-gray-500">Importe total</div>
            </div>
          </div>

          {/* Tabla por contratista */}
          {Object.entries(porContratista).map(([contratista, rows]) => {
            const subtotal = rows.reduce((s, r) => ({ viajes: s.viajes + r.viajes, m3: s.m3 + r.m3, importe: s.importe + r.importe }), { viajes: 0, m3: 0, importe: 0 })
            return (
              <div key={contratista} className="card">
                <h3 className="font-bold text-gray-900 text-lg mb-3">{contratista}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-gray-500 uppercase">
                      <th className="text-left pb-2">Obra</th>
                      <th className="text-left pb-2">Material</th>
                      <th className="text-right pb-2">Viajes</th>
                      <th className="text-right pb-2">m³</th>
                      <th className="text-right pb-2">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 text-xs text-gray-700 max-w-[150px]">{r.obra}</td>
                        <td className="py-1.5 text-gray-600">{r.material}</td>
                        <td className="py-1.5 text-right">{r.viajes}</td>
                        <td className="py-1.5 text-right">{r.m3.toFixed(1)}</td>
                        <td className="py-1.5 text-right font-medium">{formatMoneda(r.importe)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={2} className="py-2 pl-1 text-gray-700">Subtotal</td>
                      <td className="py-2 text-right">{subtotal.viajes}</td>
                      <td className="py-2 text-right">{subtotal.m3.toFixed(1)}</td>
                      <td className="py-2 text-right text-naranja-600">{formatMoneda(subtotal.importe)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}

          {filas.length === 0 && (
            <div className="card text-center py-10 text-gray-400">
              Sin viajes confirmados en el período seleccionado
            </div>
          )}
        </>
      )}
    </div>
  )
}
