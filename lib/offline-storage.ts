'use client'

import { openDB, type IDBPDatabase } from 'idb'
import type { TipoMaterial } from './supabase/types'

interface ViajeOfflineData {
  contratistaId: string
  unidadId: string
  obraOrigenId: string
  obraDestinoId: string
  zonaDestino: string
  tipoMaterial: TipoMaterial
  m3: number
  distanciaKm: number
  importeCalculado: number
  gpsLat: number | null
  gpsLng: number | null
  fotoTimestamp: string
  checadorId: string
}

interface ViajeOffline {
  tempId: string
  data: ViajeOfflineData
  fotoBase64: string
  creadoEn: number
  sincronizado: boolean
}

interface ControlViajesDB {
  viajes_pendientes: {
    key: string
    value: ViajeOffline
  }
}

let db: IDBPDatabase<ControlViajesDB> | null = null

async function getDB(): Promise<IDBPDatabase<ControlViajesDB>> {
  if (!db) {
    db = await openDB<ControlViajesDB>('control-viajes-db', 1, {
      upgrade(database) {
        database.createObjectStore('viajes_pendientes', { keyPath: 'tempId' })
      },
    })
  }
  return db
}

export async function guardarViajeOffline(
  data: ViajeOfflineData,
  fotoBase64: string
): Promise<string> {
  const d = await getDB()
  const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`
  await d.put('viajes_pendientes', {
    tempId,
    data,
    fotoBase64,
    creadoEn: Date.now(),
    sincronizado: false,
  })
  return tempId
}

export async function obtenerViajesPendientes(): Promise<ViajeOffline[]> {
  const d = await getDB()
  const todos = await d.getAll('viajes_pendientes')
  return todos.filter(v => !v.sincronizado)
}

export async function marcarViajeSincronizado(tempId: string): Promise<void> {
  const d = await getDB()
  const viaje = await d.get('viajes_pendientes', tempId)
  if (viaje) {
    await d.put('viajes_pendientes', { ...viaje, sincronizado: true })
  }
}

export async function contarPendientes(): Promise<number> {
  const pendientes = await obtenerViajesPendientes()
  return pendientes.length
}
