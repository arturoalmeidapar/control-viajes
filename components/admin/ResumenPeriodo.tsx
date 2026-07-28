'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ResumenViajes, type ViajeResumen } from './ResumenViajes'

export function ResumenPeriodo({ desde, titulo, mostrarLista }: { desde: Date; titulo: string; mostrarLista?: boolean }) {
  const [viajes, setViajes] = useState<ViajeResumen[] | null>(null)

  useEffect(() => {
    let cancelado = false
    setViajes(null)

    async function cargar() {
      const supabase = createClient()
      const desdeIso = desde.toISOString()
      const resultado: ViajeResumen[] = []
      const BATCH = 1000
      let from = 0
      while (true) {
        const { data } = await supabase
          .from('viajes')
          .select('id, estado, m3, importe_calculado, tipo_material, created_at, contratistas(nombre,codigo), unidades(tipo), obra_cobro:obras!viajes_obra_cobro_id_fkey(nombre)')
          .gte('created_at', desdeIso)
          .order('created_at', { ascending: false })
          .range(from, from + BATCH - 1)

        const batch = (data ?? []) as unknown as ViajeResumen[]
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

  return <ResumenViajes viajes={viajes} titulo={titulo} mostrarLista={mostrarLista} />
}
