import type { Viaje } from '@/lib/supabase/types'
import { ViajeCard } from './ViajeCard'

export function ViajeCardServer({ viaje }: { viaje: Viaje }) {
  return <ViajeCard viaje={viaje} onActualizado={() => {}} />
}
