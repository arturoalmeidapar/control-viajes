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

async function comprimirFoto(file: File, maxBytes = 400 * 1024): Promise<File> {
  return new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX_DIM = 1920
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      let quality = 0.85
      const compress = () => {
        canvas.toBlob(blob => {
          if (!blob) { resolve(file); return }
          if (blob.size <= maxBytes || quality <= 0.1) {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
          } else {
            quality = Math.max(0.1, quality - 0.15)
            compress()
          }
        }, 'image/jpeg', quality)
      }
      compress()
    }
    img.onerror = () => resolve(file)
    img.src = objectUrl
  })
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
  const [notas, setNotas] = useState('')

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

  // Para pipa/basura la distancia no aplica al cálculo (agua usa precio_m3, basura usa tarifa fija)
  const importeCalculado = tipoMaterial && m3 && contratista
    ? calcularImporte(
        Number(m3),
        Number(distanciaKm) || 0,
        tipoMaterial as TipoMaterial,
        tarifas,
        contratista
      )
    : 0

  // Avanzar de Paso1 a Paso2: resetear todo el estado de Paso2
  function handleAvanzarPaso2() {
    setObraOrigenId('')
    setObraDestinoId('')
    setZonaDestino('')
    setTipoMaterial('')
    setM3('')
    setDistanciaKm('')
    setDistanciaManual(false)
    setNotas('')
    setPaso(2)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleFoto(file: File, _preview: string) {
    const comprimida = await comprimirFoto(file)
    setFoto(comprimida)
    const reader = new FileReader()
    reader.onload = e => {
      const b64 = e.target?.result as string
      setFotoPreview(b64)
      setFotoBase64(b64)
    }
    reader.readAsDataURL(comprimida)
  }

  async function handleSubmit() {
    if (!foto || !tipoMaterial || !m3) return
    const noNecesitaDistancia = tipoMaterial === 'agua' || tipoMaterial === 'basura'
    if (!noNecesitaDistancia && distanciaKm === '') return

    setSubmitting(true)

    const fotoTimestamp = new Date().toISOString()

    // obra_cobro_id: para desmonte/basura se cobra al origen; para material/agua al destino
    const obraCobroId = (tipoMaterial === 'desmonte' || tipoMaterial === 'basura')
      ? (obraOrigenId || null)
      : (obraDestinoId || null)

    try {
      const supabase = createClient()

      const ext = foto.name.split('.').pop() ?? 'jpg'
      const nombreFoto = `${checadorId}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('fotos-viajes')
        .upload(nombreFoto, foto, { contentType: foto.type })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('fotos-viajes')
        .getPublicUrl(uploadData.path)

      const { data: viajeData, error: viajeError } = await supabase
        .from('viajes')
        .insert({
          checador_id: checadorId,
          contratista_id: contratistaId,
          unidad_id: unidadId,
          obra_origen_id: obraOrigenId,
          obra_destino_id: obraDestinoId || null,
          obra_cobro_id: obraCobroId,
          zona_destino: zonaDestino || null,
          m3: Number(m3),
          tipo_material: tipoMaterial as TipoMaterial,
          distancia_km: Number(distanciaKm) || 0,
          importe_calculado: importeCalculado,
          foto_url: urlData.publicUrl,
          gps_lat: gpsLat,
          gps_lng: gpsLng,
          foto_timestamp: fotoTimestamp,
          estado: 'pendiente',
          notas: notas.trim() || null,
        })
        .select('id')
        .single()

      if (viajeError) throw viajeError

      // Notificar al residente de la obra que paga
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viajeId: viajeData.id,
          obraDestinoId: obraCobroId,
          contratistaNombre: contratista?.nombre,
          unidadIdentificador: unidad?.identificador,
          m3: Number(m3),
          tipoMaterial,
        }),
      }).catch(() => {})

      router.push('/checador')
      router.refresh()

    } catch {
      await guardarViajeOffline(
        {
          contratistaId, unidadId, obraOrigenId,
          obraDestinoId: obraDestinoId || null,
          zonaDestino, tipoMaterial: tipoMaterial as TipoMaterial,
          m3: Number(m3), distanciaKm: Number(distanciaKm) || 0,
          importeCalculado, gpsLat, gpsLng, fotoTimestamp, checadorId,
          notas: notas.trim() || null,
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
          onSiguiente={handleAvanzarPaso2}
        />
      )}
      {paso === 2 && (
        <Paso2
          obras={obras}
          distancias={distancias}
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
          onTipoMaterial={v => setTipoMaterial(v as TipoMaterial | '')}
          onM3={setM3}
          onDistancia={(v, manual) => { setDistanciaKm(v); setDistanciaManual(manual) }}
          onNotas={setNotas}
          notas={notas}
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
          foto={foto}
          fotoPreview={fotoPreview}
          gpsLat={gpsLat}
          gpsLng={gpsLng}
          notas={notas}
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
