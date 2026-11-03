export type TableName = 'equipos' | 'tecnicos' | 'fallas' | 'plan' | 'ordenes' | 'repuestos' | 'parametros'

export interface Equipo {
  id: string
  nombre: string
  nombre_planta: string | null
  linea: string | null
  seccion: string | null
  tipo: string | null
  fabricante: string | null
  modelo: string | null
  activo_fijo: string | null
  fecha_creacion: string | null
  capacidad: string | null
  fuente_trabajo: string | null
  probabilidad: number | null
  consecuencia: number | null
  repuestos_promedio: number | null
  presupuesto_preventivo: number | null
}

export interface Tecnico {
  id: string
  nombre: string
  especialidad: string | null
  turno: string | null
  tarifa_hora: number | null
}

export interface Falla {
  id: string
  codigo_equipo: string
  motivo: string
  criticidad: number | null
}

export interface Plan {
  id: string
  codigo_equipo: string
  actividad: string
  descripcion: string | null
  frecuencia: string
  responsable: string | null
  duracion_h: number | null
  costo_insumos: number | null
  fecha_inicio: string | null
  observaciones: string | null
}

export interface Orden {
  id: string
  origen: string | null
  fecha_solicitud: string
  codigo_equipo: string
  tipo: string
  id_plan: string | null
  motivo: string | null
  causa: string | null
  subsistema: string | null
  prioridad: string | null
  tecnico: string | null
  detiene_produccion: boolean
  fecha_inicio: string | null
  hora_inicio: string | null
  fecha_fin: string | null
  hora_fin: string | null
  horas_hombre: number | null
  costo_repuestos: number | null
  accion: string | null
  observaciones: string | null
}

export interface Repuesto {
  id: string
  descripcion: string
  codigo_equipo: string | null
  subsistema: string | null
  unidad: string | null
  stock_actual: number | null
  stock_minimo: number | null
  costo_unitario: number | null
}

export interface ParamValor {
  horas_semana: number
  salario_tecnico: number
  horas_mes_tecnico: number
  valor_cuchilla: number
  pct_desp_corr: number
  pct_desp_prev: number
  inicio_plan: string
  meta_disp: number
  prioridades: { nombre: string; sla: number }[]
}

export interface Parametro {
  id: string
  valor: ParamValor
}

export interface DB {
  equipos: Equipo[]
  tecnicos: Tecnico[]
  fallas: Falla[]
  plan: Plan[]
  ordenes: Orden[]
  repuestos: Repuesto[]
  parametros: Parametro[]
}

export type Row = { id: string } & Record<string, unknown>
