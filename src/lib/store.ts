// Capa de datos: guarda en el navegador (modo demostración) o en Supabase (modo en línea).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { DB, Row, TableName } from './types'

export const TABLES: TableName[] = ['parametros', 'equipos', 'tecnicos', 'fallas', 'plan', 'repuestos', 'ordenes']

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null
export const MODE: 'supabase' | 'local' = supabase ? 'supabase' : 'local'

export interface Adapter {
  load(): Promise<DB>
  insert(t: TableName, row: Row): Promise<Row>
  update(t: TableName, id: string, patch: Partial<Row>): Promise<Row>
  remove(t: TableName, id: string): Promise<void>
  replaceAll(db: DB): Promise<void>
}

export async function loadSeed(): Promise<DB> {
  const mod = await import('../data/seed.json')
  return structuredClone(mod.default) as unknown as DB
}

const emptyDB = (): DB => ({ equipos: [], tecnicos: [], fallas: [], plan: [], ordenes: [], repuestos: [], parametros: [] })

// ------------------------------------------------------------------ Navegador (localStorage)

const KEY = 'cmms-bellota-db-v1'

function readLocal(): DB | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DB) : null
  } catch {
    return null
  }
}

function writeLocal(db: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch (e) {
    console.warn('No se pudo guardar en el navegador', e)
  }
}

let mem: DB | null = null

function cascadeLocal(db: DB, t: TableName, id: string) {
  // Imita las reglas de la base de datos real (on delete set null / cascade)
  if (t === 'plan') db.ordenes.forEach((o) => o.id_plan === id && (o.id_plan = null))
  if (t === 'tecnicos') db.ordenes.forEach((o) => o.tecnico === id && (o.tecnico = null))
  if (t === 'equipos') {
    db.fallas = db.fallas.filter((f) => f.codigo_equipo !== id)
    db.plan = db.plan.filter((p) => p.codigo_equipo !== id)
    db.repuestos.forEach((r) => r.codigo_equipo === id && (r.codigo_equipo = null))
  }
}

export const localAdapter: Adapter = {
  async load() {
    mem = readLocal()
    if (!mem) {
      mem = await loadSeed()
      writeLocal(mem)
    }
    return structuredClone(mem)
  },
  async insert(t, row) {
    if (!mem) mem = emptyDB()
    const list = mem[t] as unknown as Row[]
    if (list.some((r) => r.id === row.id)) throw new Error(`Ya existe un registro con el código ${row.id}.`)
    list.push(row)
    writeLocal(mem)
    return row
  },
  async update(t, id, patch) {
    if (!mem) throw new Error('Sin datos')
    const list = mem[t] as unknown as Row[]
    const i = list.findIndex((r) => r.id === id)
    if (i < 0) throw new Error('Registro no encontrado')
    list[i] = { ...list[i], ...patch, id }
    writeLocal(mem)
    return list[i]
  },
  async remove(t, id) {
    if (!mem) return
    ;(mem as unknown as Record<string, Row[]>)[t] = (mem[t] as unknown as Row[]).filter((r) => r.id !== id)
    cascadeLocal(mem, t, id)
    writeLocal(mem)
  },
  async replaceAll(db) {
    mem = structuredClone(db)
    writeLocal(mem)
  },
}

// ------------------------------------------------------------------ Supabase

function msg(e: { message: string; code?: string } | null): string {
  if (!e) return 'Error desconocido'
  if (e.code === '23505') return 'Ya existe un registro con ese código.'
  if (e.code === '23503') return 'El registro está relacionado con otros datos (por ejemplo, órdenes de trabajo) y no se puede eliminar o el código relacionado no existe.'
  if (e.code === '23514') return 'Algún dato no cumple las reglas (por ejemplo, la fecha fin es anterior a la de inicio).'
  return e.message
}

async function fetchAll(t: TableName): Promise<Row[]> {
  const out: Row[] = []
  const size = 1000
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase!.from(t).select('*').order('id').range(from, from + size - 1)
    if (error) throw new Error(msg(error))
    out.push(...((data ?? []) as Row[]))
    if (!data || data.length < size) break
  }
  return out.map(({ created_at: _c, ...r }) => r as Row)
}

export const supabaseAdapter: Adapter = {
  async load() {
    const db = emptyDB() as unknown as Record<TableName, Row[]>
    await Promise.all(TABLES.map(async (t) => (db[t] = await fetchAll(t))))
    return db as unknown as DB
  },
  async insert(t, row) {
    const { data, error } = await supabase!.from(t).insert(row).select().single()
    if (error) throw new Error(msg(error))
    return data as Row
  },
  async update(t, id, patch) {
    const { data, error } = await supabase!.from(t).update(patch).eq('id', id).select().single()
    if (error) throw new Error(msg(error))
    return data as Row
  },
  async remove(t, id) {
    const { error } = await supabase!.from(t).delete().eq('id', id)
    if (error) throw new Error(msg(error))
  },
  async replaceAll(db) {
    // Borra en orden inverso a las dependencias y vuelve a cargar por lotes
    for (const t of [...TABLES].reverse()) {
      const { error } = await supabase!.from(t).delete().neq('id', '__ninguno__')
      if (error) throw new Error(msg(error))
    }
    for (const t of TABLES) {
      const rows = db[t] as unknown as Row[]
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase!.from(t).insert(rows.slice(i, i + 500))
        if (error) throw new Error(`${t}: ${msg(error)}`)
      }
    }
  },
}

export const adapter: Adapter = MODE === 'supabase' ? supabaseAdapter : localAdapter
