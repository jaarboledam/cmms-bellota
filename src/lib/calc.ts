// Fórmulas del CMMS en Excel, pasadas a código.
// Cada función indica la columna o hoja del Excel que reemplaza.
import type { DB, Equipo, Falla, Orden, ParamValor, Plan, Repuesto, Tecnico } from './types'
import { monthKey, networkdays, timeToHours, toDays, todayDays, workday } from './dates'

export const TIPOS_MANT = ['Correctivo', 'Preventivo', 'Predictivo', 'Mejora']
export const SUBSISTEMAS = ['Mecánico', 'Eléctrico', 'Hidráulico', 'Neumático', 'Combustión', 'Combustión - Eléctrico', 'Mecánico / Hidráulico']
export const ORIGENES = ['Registro CMMS', 'Historial (Anexo 2)', 'Simulado CMMS']
export const ESPECIALIDADES = ['Mecánico', 'Eléctrico', 'Electromecánico especialista', 'Líder de mantenimiento']
export const FRECUENCIAS: { nombre: string; dias: number; porMes: number }[] = [
  { nombre: 'Diaria', dias: 1, porMes: 20 },
  { nombre: 'Semanal', dias: 7, porMes: 4 },
  { nombre: 'Bisemanal', dias: 14, porMes: 2 },
  { nombre: 'Mensual', dias: 30, porMes: 1 },
  { nombre: 'Bimestral', dias: 60, porMes: 0.5 },
  { nombre: 'Trimestral', dias: 90, porMes: 1 / 3 },
  { nombre: 'Semestral', dias: 180, porMes: 1 / 6 },
  { nombre: 'Anual', dias: 365, porMes: 1 / 12 },
  { nombre: 'Por intervención', dias: 0, porMes: 0 },
]

export const DEFAULT_PARAMS: ParamValor = {
  horas_semana: 126,
  salario_tecnico: 2800000,
  horas_mes_tecnico: 182,
  valor_cuchilla: 16000,
  pct_desp_corr: 0.9,
  pct_desp_prev: 0.3,
  inicio_plan: '2026-09-14',
  meta_disp: 0.9,
  prioridades: [
    { nombre: 'Alta', sla: 1 },
    { nombre: 'Media', sla: 3 },
    { nombre: 'Baja', sla: 7 },
  ],
}

export function getParams(db: DB): ParamValor {
  const p = db.parametros.find((x) => x.id === 'general')?.valor
  return { ...DEFAULT_PARAMS, ...(p ?? {}) }
}

/** Listas!TarifaHora = REDONDEAR(Salario / horas mensuales; 0) */
export function tarifaGeneral(p: ParamValor): number {
  return Math.round(p.salario_tecnico / (p.horas_mes_tecnico || 182))
}

// ------------------------------------------------------------------ Órdenes de trabajo

export type EstadoOT = 'Pendiente' | 'En proceso' | 'Completado'

export interface OrdenX extends Orden {
  estado: EstadoOT
  duracion: number
  horasParo: number
  costoMO: number
  costoTotal: number
  diasAbierta: number
  slaDias: number
  cumplimientoSla: 'A tiempo' | 'Fuera de plazo' | 'Atrasada' | 'En plazo'
  criticidad: number | null
  equipoNombre: string
  tecnicoNombre: string
  mes: string
}

export function deriveOrdenes(db: DB, today = todayDays()): OrdenX[] {
  const p = getParams(db)
  const tarifaG = tarifaGeneral(p)
  const tec = new Map<string, Tecnico>(db.tecnicos.map((t) => [t.id, t]))
  const eq = new Map<string, Equipo>(db.equipos.map((e) => [e.id, e]))
  const crit = new Map<string, number | null>(db.fallas.map((f) => [`${f.codigo_equipo}|${f.motivo}`, f.criticidad]))
  const sla = new Map(p.prioridades.map((x) => [x.nombre, x.sla]))
  return db.ordenes.map((o) => {
    // Estado: sin inicio = Pendiente · con inicio = En proceso · con fin = Completado
    const estado: EstadoOT = o.fecha_fin ? 'Completado' : o.fecha_inicio ? 'En proceso' : 'Pendiente'
    // Duración (h) = (fecha fin + hora fin) − (fecha inicio + hora inicio)
    let duracion = 0
    const di = toDays(o.fecha_inicio), df = toDays(o.fecha_fin)
    const hi = timeToHours(o.hora_inicio), hf = timeToHours(o.hora_fin)
    if (di !== null && df !== null && hi !== null && hf !== null) {
      duracion = Math.round(((df - di) * 24 + (hf - hi)) * 100) / 100
    }
    const horasParo = o.detiene_produccion ? duracion : 0
    const t = o.tecnico ? tec.get(o.tecnico) : undefined
    const tarifa = t?.tarifa_hora ?? tarifaG
    const costoMO = (o.horas_hombre ?? 0) * tarifa
    const costoTotal = costoMO + (o.costo_repuestos ?? 0)
    const ds = toDays(o.fecha_solicitud) ?? today
    const diasAbierta = estado === 'Completado' && df !== null ? df - ds : today - ds
    const slaDias: number = (o.prioridad ? sla.get(o.prioridad) : undefined) ?? 7
    const cumplimientoSla =
      estado === 'Completado' ? (diasAbierta <= slaDias ? 'A tiempo' : 'Fuera de plazo') : diasAbierta > slaDias ? 'Atrasada' : 'En plazo'
    const criticidad = o.tipo === 'Correctivo' ? crit.get(`${o.codigo_equipo}|${o.motivo}`) ?? null : null
    return {
      ...o,
      estado,
      duracion,
      horasParo,
      costoMO,
      costoTotal,
      diasAbierta,
      slaDias,
      cumplimientoSla,
      criticidad,
      equipoNombre: eq.get(o.codigo_equipo)?.nombre ?? 'No existe',
      tecnicoNombre: t?.nombre ?? '',
      mes: monthKey(o.fecha_solicitud),
    }
  })
}

// ------------------------------------------------------------------ Periodo

export interface Periodo {
  desde: string
  hasta: string
}

export function enPeriodo(o: { fecha_solicitud: string }, per: Periodo): boolean {
  return o.fecha_solicitud >= per.desde && o.fecha_solicitud <= per.hasta
}

/** Dashboard!HorasPeriodo = (hasta − desde + 1) / 7 × horas semanales */
export function horasPeriodo(per: Periodo, p: ParamValor): number {
  const a = toDays(per.desde) ?? 0, b = toDays(per.hasta) ?? 0
  return ((b - a + 1) / 7) * p.horas_semana
}

// ------------------------------------------------------------------ Plan preventivo

export type EstadoPlan = 'Vencido' | 'Próximo' | 'Al día' | 'Por evento'

export interface PlanX extends Plan {
  equipoNombre: string
  frecDias: number
  porMes: number
  horasMes: number
  ultima: string | null
  proxima: string | null
  diasRestantes: number | null
  estado: EstadoPlan
  ejecutadas: number
  esperadas: number
  cumplimiento: number | null
}

export function derivePlan(db: DB, ordenes: OrdenX[], today = todayDays()): PlanX[] {
  const eq = new Map(db.equipos.map((e) => [e.id, e.nombre]))
  const byPlan = new Map<string, OrdenX[]>()
  for (const o of ordenes) {
    if (o.id_plan && o.estado === 'Completado') {
      const arr = byPlan.get(o.id_plan) ?? []
      arr.push(o)
      byPlan.set(o.id_plan, arr)
    }
  }
  return db.plan.map((pl) => {
    const f = FRECUENCIAS.find((x) => x.nombre === pl.frecuencia)
    const frecDias = f?.dias ?? 0
    const porMes = f?.porMes ?? 0
    const ej = byPlan.get(pl.id) ?? []
    let ult: number | null = null
    for (const o of ej) {
      const d = toDays(o.fecha_fin)
      if (d !== null && (ult === null || d > ult)) ult = d
    }
    let prox: number | null = null
    if (frecDias > 0) {
      if (ult === null) prox = toDays(pl.fecha_inicio)
      else prox = frecDias < 7 ? workday(ult, frecDias) : ult + frecDias
    }
    const diasRestantes = prox === null ? null : prox - today
    let estado: EstadoPlan = 'Por evento'
    if (diasRestantes !== null) {
      const aviso = frecDias <= 1 ? 0 : Math.min(7, Math.ceil(frecDias * 0.2))
      estado = diasRestantes < 0 ? 'Vencido' : diasRestantes <= aviso ? 'Próximo' : 'Al día'
    }
    const ini = toDays(pl.fecha_inicio)
    let esperadas = 0
    if (frecDias > 0 && ini !== null && ini < today) {
      esperadas = frecDias < 7 ? networkdays(ini, today - 1) : Math.floor((today - 1 - ini) / frecDias) + 1
    }
    const iso = (n: number | null) => (n === null ? null : new Date(n * 86400000).toISOString().slice(0, 10))
    return {
      ...pl,
      equipoNombre: eq.get(pl.codigo_equipo) ?? 'No existe',
      frecDias,
      porMes,
      horasMes: (pl.duracion_h ?? 0) * porMes,
      ultima: iso(ult),
      proxima: iso(prox),
      diasRestantes,
      estado,
      ejecutadas: ej.length,
      esperadas,
      cumplimiento: esperadas === 0 ? null : Math.min(1, ej.length / esperadas),
    }
  })
}

// ------------------------------------------------------------------ Equipos

export interface EquipoX extends Equipo {
  indice: number | null
  nivel: string
  fallas: number
  horasParo: number
  mtbf: number
  mttr: number
  disponibilidad: number
  preventivos: number
  pctPreventivo: number
  costo: number
  planesVencidos: number
  otAbiertas: number
  estadoOperativo: 'En mantenimiento' | 'Con OT pendiente' | 'Operativo'
}

export function nivelCriticidad(indice: number | null): string {
  if (indice === null) return '—'
  if (indice >= 15) return 'Alto / Crítico'
  if (indice >= 6) return 'Medio'
  return 'Bajo'
}

export function deriveEquipos(db: DB, ordenes: OrdenX[], plan: PlanX[], per: Periodo): EquipoX[] {
  const p = getParams(db)
  const H = horasPeriodo(per, p)
  return db.equipos.map((e) => {
    const os = ordenes.filter((o) => o.codigo_equipo === e.id)
    const op = os.filter((o) => enPeriodo(o, per))
    const corr = op.filter((o) => o.tipo === 'Correctivo')
    const corrOk = corr.filter((o) => o.estado === 'Completado')
    const horasParo = op.reduce((s, o) => s + o.horasParo, 0)
    const fallas = corr.length
    const mtbf = fallas === 0 ? H : (H - horasParo) / fallas
    const mttr = corrOk.length ? corrOk.reduce((s, o) => s + o.horasParo, 0) / corrOk.length : 0
    const preventivos = op.filter((o) => o.tipo === 'Preventivo' && o.estado === 'Completado').length
    const indice = e.probabilidad && e.consecuencia ? e.probabilidad * e.consecuencia : null
    const enProceso = os.some((o) => o.estado === 'En proceso')
    const pend = os.some((o) => o.estado === 'Pendiente')
    return {
      ...e,
      indice,
      nivel: nivelCriticidad(indice),
      fallas,
      horasParo,
      mtbf,
      mttr,
      disponibilidad: H > 0 ? (H - horasParo) / H : 0,
      preventivos,
      pctPreventivo: preventivos + fallas ? preventivos / (preventivos + fallas) : 0,
      costo: op.reduce((s, o) => s + o.costoTotal, 0),
      planesVencidos: plan.filter((x) => x.codigo_equipo === e.id && x.estado === 'Vencido').length,
      otAbiertas: os.filter((o) => o.estado !== 'Completado').length,
      estadoOperativo: enProceso ? 'En mantenimiento' : pend ? 'Con OT pendiente' : 'Operativo',
    }
  })
}

// ------------------------------------------------------------------ Catálogo de fallas

export interface FallaX extends Falla {
  equipoNombre: string
  eventos: number
  horasParo: number
  mttr: number
  pctEquipo: number
  ranking: number
}

export function deriveFallas(db: DB, ordenes: OrdenX[], per: Periodo): FallaX[] {
  const eq = new Map(db.equipos.map((e) => [e.id, e.nombre]))
  const corr = ordenes.filter((o) => o.tipo === 'Correctivo' && enPeriodo(o, per))
  const stats = new Map<string, { n: number; h: number }>()
  const porEquipo = new Map<string, number>()
  for (const o of corr) {
    const k = `${o.codigo_equipo}|${o.motivo}`
    const s = stats.get(k) ?? { n: 0, h: 0 }
    s.n += 1
    s.h += o.horasParo
    stats.set(k, s)
  }
  const base = db.fallas.map((f) => {
    const s = stats.get(`${f.codigo_equipo}|${f.motivo}`) ?? { n: 0, h: 0 }
    porEquipo.set(f.codigo_equipo, (porEquipo.get(f.codigo_equipo) ?? 0) + s.n)
    return { ...f, equipoNombre: eq.get(f.codigo_equipo) ?? 'No existe', eventos: s.n, horasParo: s.h, mttr: s.n ? s.h / s.n : 0, pctEquipo: 0, ranking: 0 }
  })
  // Ranking: más eventos primero; empate → más horas de paro; empate total → la fila más abajo del catálogo (igual que el Excel)
  const sorted = [...base].sort((a, b) => b.eventos - a.eventos || b.horasParo - a.horasParo || b.id.localeCompare(a.id))
  sorted.forEach((f, i) => (f.ranking = i + 1))
  for (const f of base) {
    const tot = porEquipo.get(f.codigo_equipo) ?? 0
    f.pctEquipo = tot ? f.eventos / tot : 0
  }
  return base
}

// ------------------------------------------------------------------ Repuestos y técnicos

export type EstadoStock = 'Agotado' | 'Reponer' | 'OK'
export interface RepuestoX extends Repuesto {
  equipoNombre: string
  valor: number
  estadoStock: EstadoStock
  aPedir: number
}

export function deriveRepuestos(db: DB): RepuestoX[] {
  const eq = new Map(db.equipos.map((e) => [e.id, e.nombre]))
  return db.repuestos.map((r) => {
    const st = r.stock_actual ?? 0, min = r.stock_minimo ?? 0
    const estadoStock: EstadoStock = st <= 0 ? 'Agotado' : st <= min ? 'Reponer' : 'OK'
    return {
      ...r,
      equipoNombre: r.codigo_equipo ? eq.get(r.codigo_equipo) ?? 'General' : 'General',
      valor: st * (r.costo_unitario ?? 0),
      estadoStock,
      aPedir: st <= min ? min * 2 - st : 0,
    }
  })
}

export interface TecnicoX extends Tecnico {
  tarifa: number
  otPeriodo: number
  horasHombre: number
  costoMO: number
  otAbiertas: number
}

export function deriveTecnicos(db: DB, ordenes: OrdenX[], per: Periodo): TecnicoX[] {
  const tg = tarifaGeneral(getParams(db))
  return db.tecnicos.map((t) => {
    const os = ordenes.filter((o) => o.tecnico === t.id)
    const op = os.filter((o) => enPeriodo(o, per))
    return {
      ...t,
      tarifa: t.tarifa_hora ?? tg,
      otPeriodo: op.length,
      horasHombre: op.reduce((s, o) => s + (o.horas_hombre ?? 0), 0),
      costoMO: op.reduce((s, o) => s + o.costoMO, 0),
      otAbiertas: os.filter((o) => o.estado !== 'Completado').length,
    }
  })
}

// ------------------------------------------------------------------ Dashboard

export function kpisGlobales(db: DB, ordenes: OrdenX[], plan: PlanX[], equipos: EquipoX[], repuestos: RepuestoX[], per: Periodo) {
  const p = getParams(db)
  const H = horasPeriodo(per, p)
  const op = ordenes.filter((o) => enPeriodo(o, per))
  const corr = op.filter((o) => o.tipo === 'Correctivo')
  const corrOk = corr.filter((o) => o.estado === 'Completado')
  const prev = op.filter((o) => o.tipo === 'Preventivo')
  const horasParo = op.reduce((s, o) => s + o.horasParo, 0)
  const cerradas = op.filter((o) => o.estado === 'Completado')
  const totEsp = plan.reduce((s, x) => s + x.esperadas, 0)
  const totEj = plan.reduce((s, x) => s + x.ejecutadas, 0)
  const masFallas = [...equipos].sort((a, b) => b.fallas - a.fallas)[0]
  return {
    horasPeriodo: H,
    total: op.length,
    correctivas: corr.length,
    preventivas: prev.length,
    pctPreventivo: op.length ? prev.length / op.length : 0,
    pendientes: ordenes.filter((o) => o.estado === 'Pendiente').length,
    enProceso: ordenes.filter((o) => o.estado === 'En proceso').length,
    planesVencidos: plan.filter((x) => x.estado === 'Vencido').length,
    cumplimientoPlan: totEsp ? totEj / totEsp : 0,
    horasParo,
    mtbf: corr.length ? (H * equipos.length - horasParo) / corr.length : H,
    mttr: corrOk.length ? corrOk.reduce((s, o) => s + o.horasParo, 0) / corrOk.length : 0,
    disponibilidad: equipos.length ? equipos.reduce((s, e) => s + e.disponibilidad, 0) / equipos.length : 0,
    costo: op.reduce((s, o) => s + o.costoTotal, 0),
    cumplimientoSla: cerradas.length ? cerradas.filter((o) => o.cumplimientoSla === 'A tiempo').length / cerradas.length : 0,
    repuestosReponer: repuestos.filter((r) => r.estadoStock !== 'OK').length,
    equipoMasFallas: masFallas?.nombre ?? '—',
    metaDisp: p.meta_disp,
  }
}

export function antesDespues(db: DB, ordenes: OrdenX[], today = todayDays()) {
  const p = getParams(db)
  const ini = toDays(p.inicio_plan) ?? today
  const fechas = ordenes.map((o) => toDays(o.fecha_solicitud) ?? today)
  const min = fechas.length ? Math.min(...fechas) : ini
  const corr = ordenes.filter((o) => o.tipo === 'Correctivo')
  const antes = corr.filter((o) => (toDays(o.fecha_solicitud) ?? 0) < ini).length
  const despues = corr.length - antes
  const semAntes = (ini - min) / 7
  const semDesp = (today - ini) / 7
  const tasaAntes = semAntes > 0 ? antes / semAntes : 0
  const tasaDesp = semDesp > 0 ? despues / semDesp : 0
  return { semAntes, semDesp, tasaAntes, tasaDesp, reduccion: tasaAntes ? 1 - tasaDesp / tasaAntes : 0 }
}

// ------------------------------------------------------------------ Costos (Anexo 4)

export function comparativaCostos(db: DB, ordenes: OrdenX[], plan: PlanX[], anio: number) {
  const p = getParams(db)
  const tarifa = tarifaGeneral(p)
  const desde = `${anio}-01-01`, hasta = `${anio}-12-31`
  const corr = ordenes.filter((o) => o.tipo === 'Correctivo' && o.fecha_solicitud >= desde && o.fecha_solicitud <= hasta)
  const eventos = corr.length
  const horas = corr.reduce((s, o) => s + o.horasParo, 0)
  const porEquipo = db.equipos.map((e) => {
    const n = corr.filter((o) => o.codigo_equipo === e.id).length
    return { id: e.id, nombre: e.nombre, eventos: n, promedio: e.repuestos_promedio ?? 0, totalCorr: n * (e.repuestos_promedio ?? 0), presupuestoPrev: e.presupuesto_preventivo ?? 0 }
  })
  const horasMesPlan = plan.reduce((s, x) => s + x.horasMes, 0)
  const moCorr = horas * tarifa
  const moPrev = horasMesPlan * tarifa * 12
  const repCorr = porEquipo.reduce((s, x) => s + x.totalCorr, 0)
  const repPrev = porEquipo.reduce((s, x) => s + x.presupuestoPrev, 0)
  const despCorr = eventos * p.pct_desp_corr * p.valor_cuchilla
  const despPrev = eventos * p.pct_desp_prev * p.valor_cuchilla
  const totCorr = moCorr + repCorr + despCorr
  const totPrev = moPrev + repPrev + despPrev
  return { tarifa, eventos, horas, promedio: eventos ? horas / eventos : 0, porEquipo, horasMesPlan, moCorr, moPrev, repCorr, repPrev, despCorr, despPrev, totCorr, totPrev, ahorro: totCorr - totPrev, mejora: totCorr ? (totCorr - totPrev) / totCorr : 0 }
}

export function costoRealDesdePlan(db: DB, ordenes: OrdenX[]) {
  const ini = getParams(db).inicio_plan
  return ['Correctivo', 'Preventivo'].map((tipo) => {
    const os = ordenes.filter((o) => o.tipo === tipo && o.fecha_solicitud >= ini)
    return {
      tipo,
      n: os.length,
      hh: os.reduce((s, o) => s + (o.horas_hombre ?? 0), 0),
      mo: os.reduce((s, o) => s + o.costoMO, 0),
      rep: os.reduce((s, o) => s + (o.costo_repuestos ?? 0), 0),
      total: os.reduce((s, o) => s + o.costoTotal, 0),
    }
  })
}
