'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { suscribirNotificaciones } from '@/lib/push-client'

export function SuscribirPush() {
  const [ok, setOk] = useState(false)
  if (ok) return null
  return (
    <button
      onClick={async () => setOk(await suscribirNotificaciones())}
      className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-medium"
    >
      <Bell className="w-5 h-5 flex-shrink-0" />
      Activar notificaciones para viajes rechazados
    </button>
  )
}
