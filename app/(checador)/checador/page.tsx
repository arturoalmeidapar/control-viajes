import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BadgeEstado } from '@/components/ui/Badge'
import { SuscribirPush } from '@/components/checador/SuscribirPush'
import { PlusCircle, Clock, CheckCircle, XCircle } from 'lucide-react'
import { formatHora } from '@/lib/utils'
import type { EstadoViaje } from '@/lib/supabase/types'

export const revalidate = 0

interface ViajeResumen {
  id: string
  created_at: string
  estado: EstadoViaje
  tipo_material: string
  m3: number
  motivo_rechazo: string | null
  contratistas: { nombre: string } | null
  unidades: { identificador: string } | null
  obras_origen: { nombre: string } | null
  obras_destino: { nombre: string } | null
}

export default async function CheckadorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
  const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString()

  const { data } = await supabase
    .from('viajes')
    .select('id, created_at, estado, tipo_material, m3, motivo_rechazo, contratistas(nombre), unidades(identificador), obras_origen:obras!viajes_obra_origen_id_fkey(nombre), obras_destino:obras!viajes_obra_destino_id_fkey(nombre)')
    .eq('checador_id', user.id)
    .gte('created_at', inicioHoy)
    .lte('created_at', finHoy)
    .order('created_at', { ascending: false })

  const viajes = (data ?? []) as unknown as ViajeResumen[]

  const pendientes = viajes.filter(v => v.estado === 'pendiente').length
  const confirmados = viajes.filter(v => v.estado === 'confirmado').length
  const rechazados = viajes.filter(v => v.estado === 'rechazado').length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mi día</h1>

      {/* Contadores */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{pendientes}</div>
          <div className="text-xs text-gray-500">Pendientes</div>
        </div>
        <div className="card text-center">
          <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{confirmados}</div>
          <div className="text-xs text-gray-500">Confirmados</div>
        </div>
        <div className="card text-center">
          <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{rechazados}</div>
          <div className="text-xs text-gray-500">Rechazados</div>
        </div>
      </div>

      {/* Notificaciones push */}
      <SuscribirPush />

      {/* Botón registrar */}
      <Link href="/checador/registrar" className="btn-primary">
        <PlusCircle className="w-5 h-5" />
        Registrar Viaje
      </Link>

      {/* Lista del día */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Viajes de hoy ({viajes.length})</h2>
        {!viajes.length ? (
          <div className="card text-center py-10 text-gray-400">
            <p>Sin viajes registrados hoy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {viajes.map(v => (
              <div key={v.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {v.contratistas?.nombre ?? '-'} — {v.unidades?.identificador ?? '-'}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {v.obras_origen?.nombre ?? '-'} → {v.obras_destino?.nombre ?? '-'}
                    </div>
                    <div className="text-sm text-gray-500">{v.m3}m³ {v.tipo_material}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <BadgeEstado estado={v.estado} />
                    <div className="text-xs text-gray-400 mt-1">{formatHora(v.created_at)}</div>
                  </div>
                </div>
                {v.estado === 'rechazado' && v.motivo_rechazo && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    Motivo: {v.motivo_rechazo}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
