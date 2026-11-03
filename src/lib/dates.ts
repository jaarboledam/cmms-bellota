// Fechas como texto 'AAAA-MM-DD' y aritmética en días (sin zonas horarias).

const DAY = 86400000

export function toDays(iso: string | null | undefined): number | null {
  if (!iso) return null
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return Math.round(Date.UTC(y, m - 1, d) / DAY)
}

export function fromDays(n: number): string {
  return new Date(n * DAY).toISOString().slice(0, 10)
}

export function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayDays(): number {
  return toDays(todayISO()) as number
}

/** 0 = lunes … 6 = domingo */
function weekday(days: number): number {
  return (new Date(days * DAY).getUTCDay() + 6) % 7
}

/** Equivalente a DIA.LAB / WORKDAY (lunes a viernes). */
export function workday(start: number, n: number): number {
  let d = start
  let left = n
  while (left > 0) {
    d += 1
    if (weekday(d) < 5) left -= 1
  }
  return d
}

/** Equivalente a DIAS.LAB / NETWORKDAYS (incluye ambos extremos). */
export function networkdays(a: number, b: number): number {
  if (b < a) return 0
  let count = 0
  for (let d = a; d <= b; d++) if (weekday(d) < 5) count++
  return count
}

/** Horas decimales a partir de 'HH:MM'. */
export function timeToHours(t: string | null | undefined): number | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return null
  return h + (m || 0) / 60
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

export function yearsSince(iso: string | null): number | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  const now = new Date()
  let years = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) years -= 1
  return years
}
