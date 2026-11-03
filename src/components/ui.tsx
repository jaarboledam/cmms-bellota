import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

// ------------------------------------------------------------------ Botones y contenedores

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-dark border border-accent',
  secondary: 'bg-white text-ink border border-[#d5d9de] hover:bg-[#f7f8fa]',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-line-soft',
  danger: 'bg-white text-bad border border-[#e8b4b4] hover:bg-bad-soft',
}

export function Button({ variant = 'secondary', icon, children, className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; icon?: string }) {
  return (
    <button type="button" {...rest} className={`inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${BTN[variant]} ${className}`}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  )
}

export function IconButton({ icon, label, onClick, tone = 'neutral' }: { icon: string; label: string; onClick: (e: React.MouseEvent) => void; tone?: 'neutral' | 'danger' }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer ${tone === 'danger' ? 'text-bad hover:bg-bad-soft' : 'text-muted hover:bg-line-soft hover:text-ink'}`}>
      <Icon name={icon} size={16} />
    </button>
  )
}

export function Card({ children, className = '', title, actions }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={`bg-white border border-line rounded-xl ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
          {title && <h2 className="m-0 text-base font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1 min-w-0">
        <h1 className="m-0 text-[26px] font-bold leading-tight">{title}</h1>
        {subtitle && <p className="m-0 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export type Tone = 'neutral' | 'info' | 'warn' | 'bad' | 'good' | 'accent'
const TONE: Record<Tone, string> = {
  neutral: 'bg-line-soft text-[#3a424c]',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  good: 'bg-good-soft text-good',
  accent: 'bg-accent-soft text-accent',
}
export function Chip({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-0.5 whitespace-nowrap ${TONE[tone]}`}>{children}</span>
}

export function StatCard({ label, value, note, noteTone }: { label: string; value: ReactNode; note?: ReactNode; noteTone?: 'muted' | 'warn' | 'good' }) {
  const c = noteTone === 'warn' ? 'text-warn' : noteTone === 'good' ? 'text-good' : 'text-muted'
  return (
    <div className="bg-white border border-line rounded-xl p-4 flex flex-col gap-1 min-w-0">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      <span className="text-[28px] font-bold tracking-tight leading-tight truncate">{value}</span>
      {note && <span className={`text-[13px] ${c}`}>{note}</span>}
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return <div className="text-sm text-muted text-center py-10">{text}</div>
}

// ------------------------------------------------------------------ Modal y confirmación

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-[rgba(27,31,36,0.45)] p-3 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} my-6 flex flex-col max-h-[calc(100vh-48px)]`}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
          <h2 className="m-0 text-lg font-semibold">{title}</h2>
          <IconButton icon="close" label="Cerrar" onClick={onClose} />
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 px-5 py-4 border-t border-line">{footer}</div>}
      </div>
    </div>
  )
}

export function Confirm({ title, text, confirmLabel = 'Eliminar', onConfirm, onClose }: { title: string; text: ReactNode; confirmLabel?: string; onConfirm: () => Promise<void> | void; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="primary" disabled={busy} onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); onClose() }}>{confirmLabel}</Button>
    </>}>
      <div className="text-sm leading-relaxed">{text}</div>
    </Modal>
  )
}

// ------------------------------------------------------------------ Formularios

export type Opt = string | { value: string; label: string }
export interface FieldDef {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'time' | 'select' | 'textarea' | 'checkbox'
  options?: Opt[]
  required?: boolean
  help?: string
  full?: boolean
  lockOnEdit?: boolean
  min?: number
  max?: number
  step?: number
  placeholder?: string
}
export type Values = Record<string, unknown>

const inputCls = 'w-full h-11 rounded-lg border border-[#cfd4da] bg-white px-3 text-sm text-ink disabled:bg-line-soft disabled:text-muted'

export function Field({ f, value, onChange, disabled }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; disabled?: boolean }) {
  const id = useId()
  const opts = (f.options ?? []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const v = value === null || value === undefined ? '' : String(value)
  let control: ReactNode
  if (f.type === 'checkbox') {
    return (
      <label htmlFor={id} className={`flex items-center gap-3 min-h-11 text-sm ${f.full ? 'sm:col-span-2' : ''}`}>
        <input id={id} type="checkbox" className="w-5 h-5 accent-[#b3122e]" checked={!!value} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="font-medium">{f.label}</span>
        {f.help && <span className="text-muted text-xs">{f.help}</span>}
      </label>
    )
  }
  if (f.type === 'select') {
    control = (
      <select id={id} className={inputCls} value={v} disabled={disabled} required={f.required} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{f.required ? 'Seleccione…' : '—'}</option>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  } else if (f.type === 'textarea') {
    control = <textarea id={id} rows={3} className={`${inputCls} h-auto py-2 resize-y`} value={v} disabled={disabled} required={f.required} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
  } else {
    control = (
      <input id={id} type={f.type} className={inputCls} value={v} disabled={disabled} required={f.required} min={f.min} max={f.max} step={f.step ?? (f.type === 'number' ? 'any' : undefined)} placeholder={f.placeholder}
        onChange={(e) => onChange(f.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)} />
    )
  }
  return (
    <div className={`flex flex-col gap-1.5 ${f.full ? 'sm:col-span-2' : ''}`}>
      <label htmlFor={id} className="text-[13px] font-semibold">{f.label}{f.required && <span className="text-accent"> *</span>}</label>
      {control}
      {f.help && <span className="text-xs text-muted">{f.help}</span>}
    </div>
  )
}

export function FormModal({ title, fields: fieldsIn, initial, isEdit, onSubmit, onClose, validate, extra, onChangeValues }: {
  title: string
  fields: FieldDef[] | ((v: Values) => FieldDef[])
  initial: Values
  isEdit: boolean
  onSubmit: (v: Values) => Promise<boolean>
  onClose: () => void
  validate?: (v: Values) => string | null
  extra?: (v: Values) => ReactNode
  onChangeValues?: (v: Values, changed: string) => Values
}) {
  const [values, setValues] = useState<Values>(initial)
  const fields = typeof fieldsIn === 'function' ? fieldsIn(values) : fieldsIn
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const formId = useId()
  const set = (k: string, v: unknown) => setValues((cur) => {
    const next = { ...cur, [k]: v }
    return onChangeValues ? onChangeValues(next, k) : next
  })
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean: Values = {}
    for (const f of fields) {
      let v = values[f.name]
      if (typeof v === 'string') v = v.trim() === '' ? null : v.trim()
      if (f.type === 'checkbox') v = !!v
      clean[f.name] = v ?? null
    }
    const missing = fields.find((f) => f.required && (clean[f.name] === null || clean[f.name] === ''))
    if (missing) return setErr(`Falta el campo “${missing.label}”.`)
    const msg = validate?.(clean)
    if (msg) return setErr(msg)
    setBusy(true)
    const ok = await onSubmit(clean)
    setBusy(false)
    if (ok) onClose()
  }
  return (
    <Modal title={title} onClose={onClose} wide footer={<>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="primary" type="submit" form={formId} disabled={busy} icon="check">{isEdit ? 'Guardar cambios' : 'Crear'}</Button>
    </>}>
      <form id={formId} onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <Field key={f.name} f={f} value={values[f.name]} onChange={(v) => set(f.name, v)} disabled={isEdit && f.lockOnEdit} />
        ))}
        {extra && <div className="sm:col-span-2">{extra(values)}</div>}
        {err && <div role="alert" className="sm:col-span-2 text-sm font-medium text-bad bg-bad-soft rounded-lg px-3 py-2">{err}</div>}
      </form>
    </Modal>
  )
}

// ------------------------------------------------------------------ Tabla con búsqueda, orden y páginas

export interface Column<T> {
  key: string
  header: string
  render?: (r: T) => ReactNode
  sort?: (r: T) => string | number | null
  align?: 'left' | 'right' | 'center'
  mono?: boolean
  width?: string
}

export function DataTable<T extends { id: string }>({ rows, columns, search, pageSize = 20, actions, toolbar, initialSort, emptyText = 'No hay registros', onRowClick }: {
  rows: T[]
  columns: Column<T>[]
  search?: (r: T) => string
  pageSize?: number
  actions?: (r: T) => ReactNode
  toolbar?: ReactNode
  initialSort?: { key: string; dir: 1 | -1 }
  emptyText?: string
  onRowClick?: (r: T) => void
}) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState(initialSort ?? null)
  const [page, setPage] = useState(0)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let out = term && search ? rows.filter((r) => search(r).toLowerCase().includes(term)) : rows
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      const get = col?.sort ?? ((r: T) => (r as Record<string, unknown>)[sort.key] as string | number | null)
      out = [...out].sort((a, b) => {
        const va = get(a), vb = get(b)
        if (va === vb) return 0
        if (va === null || va === undefined || va === '') return 1
        if (vb === null || vb === undefined || vb === '') return -1
        return (va > vb ? 1 : -1) * sort.dir
      })
    }
    return out
  }, [rows, q, sort, columns, search])
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const cur = Math.min(page, pages - 1)
  const slice = filtered.slice(cur * pageSize, cur * pageSize + pageSize)
  const toggle = (k: string) => setSort((s) => (s && s.key === k ? { key: k, dir: (s.dir * -1) as 1 | -1 } : { key: k, dir: 1 }))
  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3">
        {search && (
          <label className="flex items-center gap-2 h-11 px-3 rounded-lg border border-[#cfd4da] bg-white text-muted flex-[1_1_240px] max-w-sm">
            <Icon name="search" size={16} />
            <input type="search" aria-label="Buscar" placeholder="Buscar…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} className="border-0 outline-none bg-transparent text-sm text-ink w-full" />
          </label>
        )}
        {toolbar}
        <span className="ml-auto text-[13px] text-muted">{filtered.length.toLocaleString('es-CO')} registros</span>
      </div>
      <div className="overflow-x-auto border-t border-line-soft">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f7f8fa] text-left text-muted text-xs uppercase tracking-wide">
              {columns.map((c) => (
                <th key={c.key} scope="col" style={{ width: c.width }} className={`px-3 first:pl-5 py-2.5 font-semibold whitespace-nowrap ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}>
                  <button type="button" onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 uppercase cursor-pointer hover:text-ink">
                    {c.header}
                    {sort?.key === c.key && <span aria-hidden="true">{sort.dir === 1 ? '▲' : '▼'}</span>}
                  </button>
                </th>
              ))}
              {actions && <th scope="col" className="px-3 pr-5 py-2.5 text-right font-semibold">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r.id} className={`border-t border-line-soft ${onRowClick ? 'cursor-pointer hover:bg-[#fafbfc]' : ''}`} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 first:pl-5 py-2.5 align-middle ${c.mono ? 'font-mono text-[13px] whitespace-nowrap' : ''} ${c.align === 'right' ? 'text-right tabular-nums' : c.align === 'center' ? 'text-center' : ''}`}>
                    {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '—')}
                  </td>
                ))}
                {actions && <td className="px-3 pr-5 py-1.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>{actions(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {slice.length === 0 && <Empty text={emptyText} />}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-line-soft text-sm">
          <span className="text-muted mr-2">Página {cur + 1} de {pages}</span>
          <IconButton icon="chevronLeft" label="Página anterior" onClick={() => setPage(Math.max(0, cur - 1))} />
          <IconButton icon="chevronRight" label="Página siguiente" onClick={() => setPage(Math.min(pages - 1, cur + 1))} />
        </div>
      )}
    </div>
  )
}

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Opt[] }) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-[13px] text-muted">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-lg border border-[#cfd4da] bg-white px-3 text-sm">
        <option value="">Todos</option>
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </div>
  )
}
