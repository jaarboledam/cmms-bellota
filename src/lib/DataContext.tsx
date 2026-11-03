import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { DB, ParamValor, Row, TableName } from './types'
import { adapter, loadSeed, MODE, supabase } from './store'
import {
  deriveEquipos, deriveFallas, deriveOrdenes, derivePlan, deriveRepuestos, deriveTecnicos, getParams,
  type EquipoX, type FallaX, type OrdenX, type Periodo, type PlanX, type RepuestoX, type TecnicoX,
} from './calc'
import { todayISO } from './dates'

export interface Toast { id: number; text: string; kind: 'ok' | 'error' }

interface Ctx {
  mode: 'supabase' | 'local'
  session: Session | null
  authReady: boolean
  db: DB | null
  loading: boolean
  error: string | null
  params: ParamValor
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
  ordenes: OrdenX[]
  plan: PlanX[]
  equipos: EquipoX[]
  fallas: FallaX[]
  repuestos: RepuestoX[]
  tecnicos: TecnicoX[]
  insert: (t: TableName, row: Row) => Promise<boolean>
  update: (t: TableName, id: string, patch: Partial<Row>) => Promise<boolean>
  remove: (t: TableName, id: string) => Promise<boolean>
  reload: () => Promise<void>
  restoreSeed: () => Promise<boolean>
  signOut: () => Promise<void>
  toasts: Toast[]
  notify: (text: string, kind?: 'ok' | 'error') => void
}

const DataCtx = createContext<Ctx | null>(null)

const PERIODO_KEY = 'cmms-bellota-periodo'
function initialPeriodo(): Periodo {
  try {
    const raw = localStorage.getItem(PERIODO_KEY)
    if (raw) return JSON.parse(raw) as Periodo
  } catch { /* sin almacenamiento */ }
  return { desde: '2025-01-01', hasta: todayISO() }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(MODE === 'local')
  const [db, setDb] = useState<DB | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [periodo, setPeriodoState] = useState<Periodo>(initialPeriodo)
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 3500)
  }, [])

  const setPeriodo = (p: Periodo) => {
    setPeriodoState(p)
    try { localStorage.setItem(PERIODO_KEY, JSON.stringify(p)) } catch { /* nada */ }
  }

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDb(await adapter.load())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const canLoad = MODE === 'local' || !!session
  useEffect(() => {
    if (canLoad) void reload()
    else setDb(null)
  }, [canLoad, reload])

  const apply = (t: TableName, fn: (rows: Row[]) => Row[]) =>
    setDb((cur) => (cur ? ({ ...cur, [t]: fn(cur[t] as unknown as Row[]) } as DB) : cur))

  const insert = async (t: TableName, row: Row) => {
    try {
      const saved = await adapter.insert(t, row)
      apply(t, (rows) => [...rows, saved])
      notify('Registro creado')
      return true
    } catch (e) {
      notify((e as Error).message, 'error')
      return false
    }
  }
  const update = async (t: TableName, id: string, patch: Partial<Row>) => {
    try {
      const saved = await adapter.update(t, id, patch)
      apply(t, (rows) => rows.map((r) => (r.id === id ? saved : r)))
      notify('Cambios guardados')
      return true
    } catch (e) {
      notify((e as Error).message, 'error')
      return false
    }
  }
  const remove = async (t: TableName, id: string) => {
    try {
      await adapter.remove(t, id)
      if (t === 'plan' || t === 'tecnicos' || t === 'equipos') await reload()
      else apply(t, (rows) => rows.filter((r) => r.id !== id))
      notify('Registro eliminado')
      return true
    } catch (e) {
      notify((e as Error).message, 'error')
      return false
    }
  }
  const restoreSeed = async () => {
    try {
      setLoading(true)
      await adapter.replaceAll(await loadSeed())
      await reload()
      notify('Datos del proyecto cargados')
      return true
    } catch (e) {
      notify((e as Error).message, 'error')
      setLoading(false)
      return false
    }
  }
  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
  }

  const derived = useMemo(() => {
    if (!db) return { ordenes: [], plan: [], equipos: [], fallas: [], repuestos: [], tecnicos: [] }
    const ordenes = deriveOrdenes(db)
    const plan = derivePlan(db, ordenes)
    return {
      ordenes,
      plan,
      equipos: deriveEquipos(db, ordenes, plan, periodo),
      fallas: deriveFallas(db, ordenes, periodo),
      repuestos: deriveRepuestos(db),
      tecnicos: deriveTecnicos(db, ordenes, periodo),
    }
  }, [db, periodo])

  const value: Ctx = {
    mode: MODE, session, authReady, db, loading, error,
    params: db ? getParams(db) : getParams({ parametros: [] } as unknown as DB),
    periodo, setPeriodo, ...derived,
    insert, update, remove, reload, restoreSeed, signOut, toasts, notify,
  }
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): Ctx {
  const c = useContext(DataCtx)
  if (!c) throw new Error('useData fuera de DataProvider')
  return c
}
