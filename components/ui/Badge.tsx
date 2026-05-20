import type { EstadoViaje } from '@/lib/supabase/types'
import { ETIQUETAS_ESTADO } from '@/lib/utils'

export function BadgeEstado({ estado }: { estado: EstadoViaje }) {
  const clases: Record<EstadoViaje, string> = {
    pendiente: 'badge-pendiente',
    confirmado: 'badge-confirmado',
    rechazado: 'badge-rechazado',
  }
  return <span className={clases[estado]}>{ETIQUETAS_ESTADO[estado]}</span>
}
