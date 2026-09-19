'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function SelectorFechaResumen({
  fecha, anterior, siguiente, esHoy, hoyISO,
}: {
  fecha: string
  anterior: string
  siguiente: string
  esHoy: boolean
  hoyISO: string
}) {
  const router = useRouter()

  function irA(nuevaFecha: string) {
    router.push(nuevaFecha === hoyISO ? '/checador/resumen' : `/checador/resumen?fecha=${nuevaFecha}`)
  }

  return (
    <div className="card flex items-center justify-between gap-2 py-2.5 px-3">
      <button
        onClick={() => irA(anterior)}
        className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-naranja-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Día anterior</span>
      </button>

      <input
        type="date"
        value={fecha}
        max={hoyISO}
        onChange={e => e.target.value && irA(e.target.value)}
        className="input text-sm py-1.5 px-2 w-auto text-center"
      />

      <button
        onClick={() => irA(siguiente)}
        disabled={esHoy}
        className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-naranja-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:pointer-events-none flex-shrink-0"
      >
        <span className="hidden sm:inline">Día siguiente</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
