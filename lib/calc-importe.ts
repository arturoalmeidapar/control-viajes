import type { TipoMaterial, Tarifa, Contratista } from '@/lib/supabase/types'

export function calcularImporte(
  m3: number,
  distanciaKm: number,
  tipoMaterial: TipoMaterial,
  tarifas: Tarifa[],
  contratista?: Pick<Contratista, 'id' | 'tarifa_especial'>
): number {
  const tarifa = encontrarTarifa(tipoMaterial, tarifas, contratista?.id)
  if (!tarifa) return 0

  switch (tipoMaterial) {
    case 'desmonte':
    case 'material': {
      const kmAdicional = Math.max(0, distanciaKm - tarifa.km_base)
      return m3 * tarifa.precio_m3 + kmAdicional * m3 * tarifa.precio_km_adicional
    }
    case 'agua':
      return m3 * tarifa.precio_m3
    case 'basura':
      return m3 * 300
    default:
      return 0
  }
}

function encontrarTarifa(
  tipoMaterial: TipoMaterial,
  tarifas: Tarifa[],
  contratistaId?: string
): Tarifa | undefined {
  // Primero buscar tarifa especial para este contratista
  if (contratistaId) {
    const especial = tarifas.find(
      t => t.tipo_material === tipoMaterial && t.solo_contratista_id === contratistaId
    )
    if (especial) return especial
  }
  // Tarifa general
  return tarifas.find(t => t.tipo_material === tipoMaterial && t.solo_contratista_id === null)
}

export function formatMoneda(monto: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto)
}
