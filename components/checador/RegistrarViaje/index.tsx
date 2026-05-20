'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Paso1 } from './Paso1'
import { Paso2 } from './Paso2'
import { Paso3 } from './Paso3'
import { calcularImporte } from '@/lib/calc-importe'
import { createClient } from '@/lib/supabase/client'
import { guardarViajeOffline } from '@/lib/offline-storage'
import type { Contratista, Unidad, Obra, Distancia, Tarifa, TipoMaterial } from '@/lib/supabase/types'

interface Props {
  contratistas: Contratista[]
  unidades: Unidad[]
  obras: Obra[]
  distancias: Distancia[]
  tarifas: Tarifa[]
  checadorId: string
}

export function RegistrarViaje({ contratistas, unidades, obras, distancias, tarifas, checadorId }: Props) {
  const router = useRouter()
  const [paso, setPaso] = useState<1 | 2 | 3>(1)

  // Paso 1
  const [contratistaId, setContratistaId] = useState('')
  const [unidadId, setUnidadId] = useState('')

  // Paso 2
  const [obraOrigenId, setObraOrigenId] = useState('')
  const [obraDestinoId, setObraDestinoId] = useState('')
  const [zonaDestino, setZonaDestino] = useState('')
  const [tipoMaterial, setTipoMaterial] = useState<TipoMaterial | ''>('')
  const [m3, setM3] = useState<number | ''>('')
  const [distanciaKm, setDistanciaKm] = useState<number | ''>('')
  const [distanciaManual, setDistanciaManual] = useState(false)

  // Paso 3
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState('')
  const [fotoBase64, setFotoBase64] = useState('')
  const [gpsLat, setGpsLat] = useState<number | null>(null)
  const [gpsLng, setGpsLng] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const contratista = contratistas.find(c => c.id === contratistaId)
  const unidad = unidades.find(u => u.id === unidadId)
  const obraOrigen = obras.find(o => o.id === obraOrigenId)
  const obraDestino = obras.find(o => o.id === obraDestinoId)

  const importeCalculado = tipoMaterial && m3 && distanciaKm !== '' && contratista
    ? calcularImporte(Number(m3), Number(distanciaKm), tipoMaterial as TipoMaterial, tarifas, contratista)
    : 0

  function handleFoto(file: File, preview: string) {
    setFoto(file)
    setFotoPreview(preview)
    // Guardar base64 para offline
    const reader = new FileReader()
    reader.onload = e => setFotoBase64(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    if (!foto || !tipoMaterial || !m3 || distanciaKm === '') return
    setSubmitting(true)

    const fotoTimestamp = new Date().toISOString()

    try {
      const supabase = createClient()

      // Subir foto a Supabase Storage
      const ext = foto.name.split('.').pop() ?? 'jpg'
      const nombreFoto = `${checadorId}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('fotos-viajes')
        .upload(nombreFoto, foto, { contentType: foto.type })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('fotos-viajes')
        .getPublicUrl(uploadData.path)

      // Crear viaje
      const { data: viajeData, error: viajeError } = await supabase
        .from('viajes')
        .insert({
          checador_id: checadorId,
          contratista_id: contratistaId,
          unidad_id: unidadId,
          obra_origen_id: obraOrigenId,
          obra_destino_id: obraDestinoId,
          zona_destino: zonaDestino || null,
          m3: Number(m3),
          tipo_material: tipoMaterial as TipoMaterial,
          distancia_km: Number(distanciaKm),
          importe_calculado: importeCalculado,
          foto_url: urlData.publicUrl,
          gps_lat: gpsLat,
          gps_lng: gpsLng,
          foto_timestamp: fotoTimestamp,
          estado: 'pendiente',
        })
        .select('id')
        .single()

      if (viajeError) throw viajeError

      // Enviar notificación push al residente
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viajeId: viajeData.id,
          obraDestinoId,
          contratistaNombre: contratista?.nombre,
          unidadIdentificador: unidad?.identificador,
          m3: Number(m3),
          tipoMaterial,
        }),
      }).catch(() => {}) // No bloquear si push falla

      router.push('/checador')
      router.refresh()

    } catch {
      // Guardar offline si hay error de red
      await guardarViajeOffline(
        {
          contratistaId, unidadId, obraOrigenId, obraDestinoId,
          zonaDestino, tipoMaterial: tipoMaterial as TipoMaterial,
          m3: Number(m3), distanciaKm: Number(distanciaKm),
          importeCalculado, gpsLat, gpsLng, fotoTimestamp, checadorId,
        },
        fotoBase64
      )
      alert('Sin conexión — el viaje se guardó localmente y se sincronizará al recuperar internet.')
      router.push('/checador')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Indicador de pasos */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(n => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              paso === n ? 'bg-naranja-500 text-white' :
              paso > n ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>{n}</div>
            {n < 3 && <div className={`flex-1 h-1 rounded ${paso > n ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {paso === 1 && (
        <Paso1
          contratistas={contratistas}
          unidades={unidades}
          contratistaId={contratistaId}
          unidadId={unidadId}
          onContratista={setContratistaId}
          onUnidad={setUnidadId}
          onSiguiente={() => setPaso(2)}
        />
      )}
      {paso === 2 && (
        <Paso2
          obras={obras}
          distancias={distancias}
          tarifas={tarifas}
          contratista={contratista}
          unidad={unidad}
          obraOrigenId={obraOrigenId}
          obraDestinoId={obraDestinoId}
          zonaDestino={zonaDestino}
          tipoMaterial={tipoMaterial}
          m3={m3}
          distanciaKm={distanciaKm}
          distanciaManual={distanciaManual}
          onObraOrigen={setObraOrigenId}
          onObraDestino={setObraDestinoId}
          onZonaDestino={setZonaDestino}
          onTipoMaterial={setTipoMaterial}
          onM3={setM3}
          onDistancia={(v, manual) => { setDistanciaKm(v); setDistanciaManual(manual) }}
          onSiguiente={() => setPaso(3)}
          onAtras={() => setPaso(1)}
        />
      )}
      {paso === 3 && (
        <Paso3
          contratista={contratista}
          unidad={unidad}
          obraOrigen={obraOrigen}
          obraDestino={obraDestino}
          zonaDestino={zonaDestino}
          tipoMaterial={tipoMaterial}
          m3={m3}
          distanciaKm={distanciaKm}
          importeCalculado={importeCalculado}
          foto={foto}
          fotoPreview={fotoPreview}
          gpsLat={gpsLat}
          gpsLng={gpsLng}
          submitting={submitting}
          onFoto={handleFoto}
          onGps={(lat, lng) => { setGpsLat(lat); setGpsLng(lng) }}
          onSubmit={handleSubmit}
          onAtras={() => setPaso(2)}
        />
      )}
    </div>
  )
}
