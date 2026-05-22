'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, MapPin, AlertCircle } from 'lucide-react'
import type { Contratista, Unidad, Obra, TipoMaterial } from '@/lib/supabase/types'
import { ETIQUETAS_MATERIAL } from '@/lib/utils'

interface Paso3Props {
  contratista: Contratista | undefined
  unidad: Unidad | undefined
  obraOrigen: Obra | undefined
  obraDestino: Obra | undefined
  zonaDestino: string
  tipoMaterial: TipoMaterial | ''
  m3: number | ''
  distanciaKm: number | ''
  foto: File | null
  fotoPreview: string
  gpsLat: number | null
  gpsLng: number | null
  notas: string
  submitting: boolean
  onFoto: (file: File, preview: string) => void
  onGps: (lat: number, lng: number) => void
  onSubmit: () => void
  onAtras: () => void
}

export function Paso3({
  contratista, unidad, obraOrigen, obraDestino, zonaDestino,
  tipoMaterial, m3, distanciaKm,
  foto, fotoPreview, gpsLat, gpsLng, notas, submitting,
  onFoto, onGps, onSubmit, onAtras,
}: Paso3Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [gpsError, setGpsError] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)

  useEffect(() => {
    capturarGPS()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function capturarGPS() {
    if (!navigator.geolocation) { setGpsError('GPS no disponible'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        onGps(pos.coords.latitude, pos.coords.longitude)
        setGpsLoading(false)
      },
      () => {
        setGpsError('No se pudo obtener GPS — se registrará sin coordenadas')
        setGpsLoading(false)
      },
      { timeout: 10000 }
    )
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onFoto(file, ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Paso 3 de 3</h2>
        <p className="text-gray-500 text-sm mt-1">Foto del viaje y confirmación</p>
      </div>

      {/* GPS */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
        gpsLat ? 'bg-green-50 text-green-700' : gpsError ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'
      }`}>
        <MapPin className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">
          {gpsLoading && 'Obteniendo GPS...'}
          {!gpsLoading && gpsLat && `GPS: ${gpsLat.toFixed(5)}, ${gpsLng?.toFixed(5)}`}
          {!gpsLoading && !gpsLat && !gpsError && 'GPS no capturado'}
          {gpsError && gpsError}
        </span>
        {!gpsLat && !gpsLoading && (
          <button onClick={capturarGPS} className="ml-auto text-xs underline">Reintentar</button>
        )}
      </div>

      {/* Foto */}
      <div>
        <label className="label">Foto del viaje <span className="text-red-500">*</span></label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFoto}
        />
        {fotoPreview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotoPreview} alt="Foto del viaje" className="w-full h-48 object-cover rounded-2xl" />
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" /> Retomar
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full h-40 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-naranja-400 hover:text-naranja-500 transition-colors"
          >
            <Camera className="w-10 h-10" />
            <span className="text-sm font-medium">Abrir cámara</span>
            <span className="text-xs text-gray-400">Solo cámara en vivo — no galería</span>
          </button>
        )}
        {!foto && (
          <div className="flex items-center gap-2 mt-2 text-xs text-amber-600">
            <AlertCircle className="w-3.5 h-3.5" />
            La foto es obligatoria para registrar el viaje
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="card space-y-2 text-sm">
        <h3 className="font-semibold text-gray-900 mb-3">Resumen del viaje</h3>
        <Row label="Contratista" value={contratista?.nombre ?? '-'} />
        <Row label="Unidad" value={unidad?.identificador ?? '-'} />
        <Row label="Origen" value={obraOrigen?.nombre ?? '-'} />
        <Row label="Destino" value={`${obraDestino?.nombre ?? '-'}${zonaDestino ? ` — ${zonaDestino}` : ''}`} />
        <Row label="Material" value={tipoMaterial ? ETIQUETAS_MATERIAL[tipoMaterial] : '-'} />
        <Row label="m³" value={m3 ? `${m3} m³` : '-'} />
        <Row label="Distancia" value={distanciaKm !== '' ? `${distanciaKm} km` : '-'} />
        {notas && <Row label="Notas" value={notas} />}
      </div>

      <div className="flex gap-3">
        <button className="btn-secondary flex-1" onClick={onAtras} disabled={submitting}>Atrás</button>
        <button className="btn-primary flex-1" onClick={onSubmit} disabled={!foto || submitting}>
          {submitting ? 'Guardando...' : 'Registrar Viaje'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-700">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  )
}
