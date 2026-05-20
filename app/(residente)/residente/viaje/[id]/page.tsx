import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ViajeCardServer } from '@/components/residente/ViajeCardServer'

export default async function ViajeDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: viaje } = await supabase
    .from('viajes')
    .select('*, contratistas(nombre,codigo), unidades(identificador,tipo), obras_origen:obras!viajes_obra_origen_id_fkey(nombre), obras_destino:obras!viajes_obra_destino_id_fkey(nombre,es_campo_golf)')
    .eq('id', params.id)
    .single()

  if (!viaje) notFound()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Detalle del viaje</h1>
      <ViajeCardServer viaje={viaje} />
    </div>
  )
}
