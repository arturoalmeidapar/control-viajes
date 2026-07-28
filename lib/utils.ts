
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

const ZONA_MX = 'America/Mazatlan'
const DIAS_SEMANA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

function offsetMinutos(instante: Date, timeZone: string): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instante).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {} as Record<string, string>)

  const comoUTC = Date.UTC(
    Number(partes.year), Number(partes.month) - 1, Number(partes.day),
    Number(partes.hour), Number(partes.minute), Number(partes.second),
  )
  return (comoUTC - instante.getTime()) / 60000
}

function fechaLocal(instante: Date, timeZone: string): { year: number; month: number; day: number; weekday: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(instante).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {} as Record<string, string>)

  return {
    year: Number(partes.year),
    month: Number(partes.month),
    day: Number(partes.day),
    weekday: DIAS_SEMANA[partes.weekday],
  }
}

function inicioDiaUTC(year: number, month: number, day: number, timeZone: string): Date {
  const aproximado = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const offset = offsetMinutos(aproximado, timeZone)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offset * 60000)
}

/** Inicio del día actual (00:00) en horario de México (America/Mazatlan), como Date UTC real. */
export function inicioHoyMX(referencia: Date = new Date()): Date {
  const { year, month, day } = fechaLocal(referencia, ZONA_MX)
  return inicioDiaUTC(year, month, day, ZONA_MX)
}

/** Inicio del lunes de la semana actual (00:00) en horario de México. */
export function inicioSemanaMX(referencia: Date = new Date()): Date {
  const { year, month, day, weekday } = fechaLocal(referencia, ZONA_MX)
  const diff = weekday === 0 ? -6 : 1 - weekday
  const lunes = new Date(Date.UTC(year, month - 1, day + diff))
  return inicioDiaUTC(lunes.getUTCFullYear(), lunes.getUTCMonth() + 1, lunes.getUTCDate(), ZONA_MX)
}

/** Inicio del día 1 del mes actual (00:00) en horario de México. */
export function inicioMesMX(referencia: Date = new Date()): Date {
  const { year, month } = fechaLocal(referencia, ZONA_MX)
  return inicioDiaUTC(year, month, 1, ZONA_MX)
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
