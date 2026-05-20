
export function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function inicioFinSemana(fecha: Date): { inicio: Date; fin: Date } {
  const dia = fecha.getDay()
  const diff = dia === 0 ? -6 : 1 - dia // lunes como inicio
  const inicio = new Date(fecha)
  inicio.setDate(fecha.getDate() + diff)
  inicio.setHours(0, 0, 0, 0)
  const fin = new Date(inicio)
  fin.setDate(inicio.getDate() + 6)
  fin.setHours(23, 59, 59, 999)
  return { inicio, fin }
}

export function isoFecha(fecha: Date): string {
  return fecha.toISOString().split('T')[0]
}

export const ETIQUETAS_MATERIAL: Record<string, string> = {
  desmonte: 'Desmonte',
  material: 'Material',
  agua: 'Agua',
  basura: 'Basura',
}

export const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  rechazado: 'Rechazado',
}

export const COLORES_ESTADO: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
}
