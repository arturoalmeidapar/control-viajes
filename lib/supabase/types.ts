export type TipoUnidad = 'camion' | 'pipa'
export type TipoMaterial = 'desmonte' | 'material' | 'agua' | 'basura'
export type EstadoViaje = 'pendiente' | 'confirmado' | 'rechazado'
export type RolUsuario = 'admin' | 'checador' | 'residente'

export interface Contratista {
  id: string
  nombre: string
  codigo: string
  tarifa_especial: boolean
  activo: boolean
  created_at: string
}

export interface Unidad {
  id: string
  contratista_id: string
  identificador: string
  tipo: TipoUnidad
  capacidad_m3: number | null
  activo: boolean
}

export interface Obra {
  id: string
  nombre: string
  activo: boolean
  es_campo_golf: boolean
}

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
  activo: boolean
  puede_ver_todo?: boolean
  push_subscription: Record<string, unknown> | null
}

export interface ResidenteObra {
  id: string
  usuario_id: string
  obra_id: string
}

export interface Distancia {
  id: string
  obra_origen_id: string
  obra_destino_id: string
  distancia_km: number
  nota: string | null
}

export interface Tarifa {
  id: string
  tipo_material: TipoMaterial
  precio_m3: number
  precio_km_adicional: number
  km_base: number
  solo_contratista_id: string | null
}

export interface Viaje {
  id: string
  created_at: string
  checador_id: string
  contratista_id: string
  unidad_id: string
  obra_origen_id: string
  obra_destino_id: string
  zona_destino: string | null
  m3: number
  tipo_material: TipoMaterial
  distancia_km: number
  importe_calculado: number
  foto_url: string
  gps_lat: number | null
  gps_lng: number | null
  foto_timestamp: string
  estado: EstadoViaje
  residente_id: string | null
  residente_timestamp: string | null
  motivo_rechazo: string | null
  // Datos relacionados (joins)
  contratistas?: Pick<Contratista, 'id' | 'nombre' | 'codigo'>
  unidades?: Pick<Unidad, 'id' | 'identificador' | 'tipo'>
  obras_origen?: Pick<Obra, 'id' | 'nombre'>
  obras_destino?: Pick<Obra, 'id' | 'nombre' | 'es_campo_golf'>
  checador?: Pick<Usuario, 'id' | 'nombre'>
  residente?: Pick<Usuario, 'id' | 'nombre'>
}

type ViajeSinJoins = Omit<Viaje, 'contratistas' | 'unidades' | 'obras_origen' | 'obras_destino' | 'checador' | 'residente'>

export interface Database {
  public: {
    Tables: {
      contratistas: {
        Row: Contratista
        Insert: Omit<Contratista, 'id' | 'created_at'>
        Update: Partial<Omit<Contratista, 'id' | 'created_at'>>
        Relationships: []
      }
      unidades: {
        Row: Unidad
        Insert: Omit<Unidad, 'id'>
        Update: Partial<Omit<Unidad, 'id'>>
        Relationships: []
      }
      obras: {
        Row: Obra
        Insert: Omit<Obra, 'id'>
        Update: Partial<Omit<Obra, 'id'>>
        Relationships: []
      }
      usuarios: {
        Row: Usuario
        Insert: Omit<Usuario, 'id'>
        Update: Partial<Omit<Usuario, 'id'>>
        Relationships: []
      }
      residentes_obras: {
        Row: ResidenteObra
        Insert: Omit<ResidenteObra, 'id'>
        Update: Partial<Omit<ResidenteObra, 'id'>>
        Relationships: []
      }
      distancias: {
        Row: Distancia
        Insert: Omit<Distancia, 'id'>
        Update: Partial<Omit<Distancia, 'id'>>
        Relationships: []
      }
      tarifas: {
        Row: Tarifa
        Insert: Omit<Tarifa, 'id'>
        Update: Partial<Omit<Tarifa, 'id'>>
        Relationships: []
      }
      viajes: {
        Row: ViajeSinJoins
        Insert: Omit<ViajeSinJoins, 'id' | 'created_at'>
        Update: Partial<Pick<ViajeSinJoins, 'estado' | 'residente_id' | 'residente_timestamp' | 'motivo_rechazo'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
