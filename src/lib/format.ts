const nf = (d: number) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d })

export const num = (n: number | null | undefined, d = 0) => (n === null || n === undefined || Number.isNaN(n) ? '—' : nf(d).format(n))
export const cop = (n: number | null | undefined) => (n === null || n === undefined ? '—' : '$' + nf(0).format(Math.round(n)))
export const copM = (n: number) => '$' + nf(1).format(n / 1e6) + ' M'
export const pct = (n: number | null | undefined, d = 1) => (n === null || n === undefined ? '—' : nf(d).format(n * 100) + ' %')
export const horas = (n: number | null | undefined) => (n === null || n === undefined ? '—' : nf(1).format(n) + ' h')

export function fecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export function mesCorto(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MESES[m - 1]} ${String(y).slice(2)}`
}
