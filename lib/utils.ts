
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

function horaEnDiaUTC(year: number, month: number, day: number, hora: number, timeZone: string): Date {
  const aproximado = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const offset = offsetMinutos(aproximado, timeZone)
  return new Date(Date.UTC(year, month - 1, day, hora, 0, 0) - offset * 60000)
}

function inicioDiaUTC(year: number, month: number, day: number, timeZone: string): Date {
  return horaEnDiaUTC(year, month, day, 0, timeZone)
}

function sumarDiasFechaCalendario(dia: { year: number; month: number; day: number }, delta: number): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(dia.year, dia.month - 1, dia.day + delta))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

/** Hora en que el sistema cambia de "día operativo" (6:00 PM, horario de Los Cabos / America/Mazatlan). */
export const HORA_CORTE_MX = 18

/**
 * Fecha (calendario) del día operativo vigente en un instante dado, según el corte de las 6:00pm
 * en horario de México (America/Mazatlan). Antes de las 6:00pm el día operativo es el día calendario
 * actual; a partir de las 6:00pm ya es el día calendario siguiente.
 */
export function diaOperativoMX(referencia: Date = new Date()): { year: number; month: number; day: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_MX, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
  }).formatToParts(referencia).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {} as Record<string, string>)

  const dia = { year: Number(partes.year), month: Number(partes.month), day: Number(partes.day) }
  const hora = Number(partes.hour)
  return hora >= HORA_CORTE_MX ? sumarDiasFechaCalendario(dia, 1) : dia
}

/** Rango [inicio, fin) del día operativo indicado (por defecto el actual), con corte a las 6:00pm MX. */
export function rangoDiaOperativoMX(dia: { year: number; month: number; day: number } = diaOperativoMX()): { inicio: Date; fin: Date } {
  const anterior = sumarDiasFechaCalendario(dia, -1)
  return {
    inicio: horaEnDiaUTC(anterior.year, anterior.month, anterior.day, HORA_CORTE_MX, ZONA_MX),
    fin: horaEnDiaUTC(dia.year, dia.month, dia.day, HORA_CORTE_MX, ZONA_MX),
  }
}

/** Suma (o resta) días a una fecha {year,month,day}, respetando cambios de mes/año. */
export function sumarDiasFecha(dia: { year: number; month: number; day: number }, delta: number): { year: number; month: number; day: number } {
  return sumarDiasFechaCalendario(dia, delta)
}

/** Formatea {year,month,day} como 'YYYY-MM-DD'. */
export function diaOperativoISO(dia: { year: number; month: number; day: number }): string {
  return `${dia.year}-${String(dia.month).padStart(2, '0')}-${String(dia.day).padStart(2, '0')}`
}

/** Parsea 'YYYY-MM-DD' a {year,month,day}. */
export function parseDiaISO(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

/** Inicio del día operativo actual (corte 6:00pm MX), como Date UTC real. */
export function inicioHoyMX(referencia: Date = new Date()): Date {
  return rangoDiaOperativoMX(diaOperativoMX(referencia)).inicio
}

/** Fin (exclusivo) del día operativo actual (corte 6:00pm MX), como Date UTC real. */
export function finHoyMX(referencia: Date = new Date()): Date {
  return rangoDiaOperativoMX(diaOperativoMX(referencia)).fin
}

/** Inicio del lunes de la semana del día operativo actual (00:00) en horario de México. */
export function inicioSemanaMX(referencia: Date = new Date()): Date {
  const { year, month, day } = diaOperativoMX(referencia)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  const lunes = sumarDiasFechaCalendario({ year, month, day }, diff)
  return inicioDiaUTC(lunes.year, lunes.month, lunes.day, ZONA_MX)
}

/** Inicio del día 1 del mes del día operativo actual (00:00) en horario de México. */
export function inicioMesMX(referencia: Date = new Date()): Date {
  const { year, month } = diaOperativoMX(referencia)
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
